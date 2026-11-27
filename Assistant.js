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
		$this.m_methods=new Methods(sourceUrl, $this.m_conversation, (event, details, attachment)=>this.NotifyAssistant(event, details, attachment), ()=>this.Notify());
	}
	_['public'].GetMethods=function () { return _(this).m_methods; };
	_['public'].GetMessages=function () { return _(this).m_conversation.GetMessages(); };
	_['public'].SetReady=function (ready) { _(this).m_ready=ready; };
	_['public'].IsConsulting=function () { return !!_(this).m_activeTurn; };
	_['public'].Subscribe=function (listener) {
		let $this=_(this);
		$this.m_listeners.add(listener);
		listener();
		return ()=>$this.m_listeners.delete(listener);
	};
	_['public'].Notify=function () {
		for (let listener of _(this).m_listeners) {
			try { listener(); }
			catch (error) { console.error('Subscriber failed:', error); }
		}
	};
	_['public'].Reply=function (text, fields={}) {
		_(this).m_conversation.Add('assistant', text, fields);
		this.Notify();
	};
	_['public'].ReportError=function (error) {
		_(this).m_conversation.Add('system', error?.message||String(error));
		this.Notify();
	};
	_['public'].Stop=function () {
		let $this=_(this);
		$this.m_activeTurn?.abort();
		$this.m_activeTurn=null;
		this.Notify();
	};
	_['public'].ReadResponse=function (value, allowMethod=true) {
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
			||!response.reply.trim()&&!response.MethodName) return fallback();
		return {...response, Valid: true};
	};
	_['public'].RequestResponse=async function (prompt, options, allowMethod=false) {
		let response=await Flow.generate.text(prompt, options);
		return this.ReadResponse(response?.text, allowMethod);
	};
	_['public'].GetInstruction=function (runtime, methods) {
		return '你是 Assistant。請依對話另一方本輪使用的語言回答，並根據實際結果處理要求。\n'
			+'目前能力：'+runtime+'\n可用方法：'+methods+'\n'
			+'只輸出單一標準 JSON 物件。一般回覆 {"reply":"給對話另一方看的文字"}；'
			+'需要執行方法時回覆 {"reply":"","MethodName":"類型.方法","Arguments":{}}。'
			+'MethodName 必須是現有類型與其方法的完整名稱；執行後會把實際結果交還給你。'
			+'在取得結果之前不得聲稱已完成。收到結果後決定下一個方法或回覆。不要加入 Markdown 或額外文字。';
	};
	_['public'].GetRequest=async function (message, completed) {
		let methods=_(this).m_methods;
		let runtime=methods.Modules.InspectRuntime({}).message;
		return methods.GetRequest(message, completed, this.GetMessages(), this.GetInstruction(runtime, methods.GetInstruction()));
	};
	_['public'].Send=async function (value) {
		let $this=_(this);
		let message=String(value??'').trim();
		if (!message||this.IsConsulting()) return;
		let turn=$this.m_activeTurn=new AbortController();
		$this.m_conversation.Add('user', message);
		this.Notify();
		try { await $this.Process(message, turn); }
		catch (error) { if (!turn.signal.aborted) this.ReportError(error); }
		finally {
			if ($this.m_activeTurn===turn) {
				$this.m_activeTurn=null;
				this.Notify();
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
			let request=await this.GetRequest(message, completed);
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
				lastResult=null;
				record.Status='failed';
				record.Result=error?.message||String(error);
			}
			completed.push(record);
		}
		if (turn.signal.aborted) return;
		let request=await this.GetRequest(message, completed);
		let prompt=request.Prompt+'\n請根據以上已發生的結果直接回答，不要再要求執行方法。';
		let final=await this.RequestResponse(prompt, request.Options);
		if (turn.signal.aborted) return;
		let fields=$this.m_methods.CompleteResponse(final.reply, responses, lastResult);
		this.Reply(final.reply, fields);
	};
	_['public'].NotifyAssistant=async function (event, details={}, attachment) {
		try {
			let $this=_(this);
			await $this.m_ready;
			let recent=this.GetMessages().slice(-8).map((entry)=>entry.Sender+': '+entry.Text).join('\n');
			let prompt='最近對話：\n'+recent+'\n事件：'+event+'\n實際結果：'+JSON.stringify(details)+'\n請依目前對話語言簡短回答。';
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
