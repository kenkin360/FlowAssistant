var Assistant=Function.extend(Object, function () {
	var _=this(Assistant);
	Assistant=_[Assistant];
	function Assistant(sourceUrl) {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_conversation=new Conversation();
		$this.m_listeners=new Set();
		$this.m_activeTurn=null;
		$this.m_ready=Promise.resolve();
		$this.m_methods=new Methods(sourceUrl, $this.m_conversation, (event, details, attachment)=>$this.NotifyAssistant(event, details, attachment), ()=>$this.Notify());
	}
	_['public'].GetMethods=function () { return _(this).m_methods; };
	_['public'].GetMessages=function () { return _(this).m_conversation.GetMessages(); };
	_['public'].SetReady=function (ready) { _(this).m_ready=ready; };
	_['public'].IsConsulting=function () { return !!_(this).m_activeTurn; };
	_['public'].Subscribe=function (listener) {
		let $this=_(this);
		$this.m_listeners.add(listener);
		try { listener(); }
		catch (error) { console.error('Subscriber failed:', error); }
		return ()=>$this.m_listeners.delete(listener);
	};
	_['protected'].Notify=function (details) {
		for (let listener of _(this).m_listeners) {
			try { listener(details); }
			catch (error) { console.error('Subscriber failed:', error); }
		}
	};
	_['public'].Reply=function (text, fields={}) {
		_(this).m_conversation.Add('assistant', text, fields);
		_(this).Notify(fields);
	};
	_['public'].ReportError=function (error) {
		try {
			_(this).m_conversation.Add('system', error?.message||String(error));
			_(this).Notify();
		}
		catch (reportError) { console.error('Unable to record failure:', reportError); }
	};
	_['public'].Stop=function () {
		let $this=_(this);
		$this.m_activeTurn?.abort();
		$this.m_activeTurn=null;
		_(this).Notify();
	};
	_['protected'].ReadResponse=function (value, allowMethod=true) {
		let raw=String(value??'');
		let fallback=()=>({reply: '回應格式不正確，未執行任何方法。原始回應：\n'+raw, MethodName: null, Arguments: null, Valid: false});
		let match=raw.match(/^\s*(\{[\s\S]*\})\s*$/)||raw.match(/^\s*\x60{3}json\s*\n\s*(\{[\s\S]*\})\s*\n\x60{3}\s*$/i);
		if (!match) return fallback();
		let parsed=null;
		try { parsed=JSON.parse(match[1]); }
		catch (error) { return fallback(); }
		if (!parsed||'object'!==typeof parsed||Array.isArray(parsed)) return fallback();
		let response={...parsed, reply: parsed.reply??'', MethodName: parsed.MethodName??null,
			Arguments: parsed.MethodName?parsed.Arguments??{}:parsed.Arguments??null};
		if ('string'!==typeof response.reply
			||null!==response.MethodName&&(false===allowMethod||'string'!==typeof response.MethodName||!response.MethodName.trim()
				||!response.Arguments||'object'!==typeof response.Arguments||Array.isArray(response.Arguments))
			||null===response.MethodName&&null!==response.Arguments
			||response.MethodName&&!!response.reply.trim()
			||!response.reply.trim()&&!response.MethodName) return fallback();
		return {...response, Valid: true};
	};
	_['public'].RequestResponse=async function (prompt, options, allowMethod=false) {
		let response=await Flow.generate.text(prompt, options);
		return _(this).ReadResponse(response?.text, allowMethod);
	};
	_['public'].GetInstruction=function (runtime, methods) {
		return '你是 Assistant。請依對話另一方本輪使用的語言回答，並根據實際結果處理要求。\n'
			+'目前能力：'+runtime+'\n可用方法：'+methods+'\n'
			+'回覆格式為單一標準 JSON 物件。一般回覆 {"reply":"給對話另一方看的文字"}；'
			+'需要執行方法時回覆 {"reply":"","MethodName":"類型.方法","Arguments":{}}。'
			+'MethodName 使用現有類型與其方法的完整名稱；執行後會把實際結果交還給你。'
			+'收到方法結果後，根據實際結果選擇下一個方法，或在 reply 中陳述已完成的事項。';
	};
	_['protected'].GetRequest=async function (message, completed) {
		let methods=_(this).m_methods;
		let runtime=methods.Modules.InspectRuntime({}).message;
		return methods.GetRequest(message, completed, this.GetMessages(), this.GetInstruction(runtime, methods.GetInstruction()));
	};
	_['public'].Send=async function (value) {
		let $this=_(this);
		let message=String(value??'').trim();
		if (!message||this.IsConsulting()) return;
		let turn=$this.m_activeTurn=new AbortController();
		try {
			$this.m_conversation.Add('user', message);
			_(this).Notify();
			await $this.Process(message, turn);
		}
		catch (error) {
			if (!turn.signal.aborted) {
				console.error('Conversation failed:', error);
				this.ReportError(error);
			}
		}
		finally {
			if ($this.m_activeTurn===turn) {
				$this.m_activeTurn=null;
				_(this).Notify();
			}
		}
	};
	_['protected'].Process=async function (message, turn) {
		let $this=_(this);
		await $this.m_ready;
		let completed=[];
		let responses=[];
		let lastResult=null;
		for (let count=0; count<12; count++) {
			if (turn.signal.aborted) return;
			let request=await _(this).GetRequest(message, completed);
			let response=await this.RequestResponse(request.Prompt, request.Options, true);
			if (turn.signal.aborted) return;
			if (!response.Valid||!response.MethodName) {
				let fields=$this.m_methods.CompleteResponse(response.reply, responses.concat(response.Valid?[response]:[]), lastResult);
				this.Reply(response.reply, fields);
				return;
			}
			responses.push(response);
			let record={MethodName: response.MethodName};
			try {
				lastResult=await $this.m_methods.Invoke(response.MethodName, response.Arguments);
				record.Status='completed';
				record.Result=$this.m_methods.DescribeResult(lastResult);
			}
			catch (error) {
				console.error('Method failed:', error);
				lastResult=null;
				record.Status='failed';
				record.Result=error?.message||String(error);
			}
			completed.push(record);
		}
		if (turn.signal.aborted) return;
		let request=await _(this).GetRequest(message, completed);
		let prompt=request.Prompt+'\n請根據以上已發生的結果，以 {"reply":"根據結果給對話另一方的回答"} 結束本輪。';
		let final=await this.RequestResponse(prompt, request.Options);
		if (turn.signal.aborted) return;
		let fields=$this.m_methods.CompleteResponse(final.reply, responses, lastResult);
		this.Reply(final.reply, fields);
	};
	_['protected'].NotifyAssistant=async function (event, details={}, attachment) {
		try {
			let $this=_(this);
			await $this.m_ready;
			let recent=this.GetMessages().slice(-8).map((entry)=>entry.Sender+': '+entry.Text).join('\n');
			let prompt='最近對話：\n'+recent+'\n事件：'+event+'\n實際結果：'+JSON.stringify(details)+'\n請依目前對話語言，根據實際結果回答。';
			let response=await this.RequestResponse(prompt, {systemInstruction: this.GetInstruction('', '')});
			this.Reply(response.reply, attachment?{attachment: $this.m_methods.NormalizeAttachment(attachment)}:{});
		}
		catch (error) { this.ReportError(error); }
	};
	_['protected'].m_conversation=null;
	_['protected'].m_methods=null;
	_['protected'].m_listeners=null;
	_['protected'].m_activeTurn=null;
	_['protected'].m_ready=null;
});
