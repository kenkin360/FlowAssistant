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
	_['public'].Reply=function (response) {
		_(this).m_conversation.Add('assistant', response.Reply, response);
		_(this).Notify(response);
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
	_['protected'].ReadResponse=function (value) {
		let raw=String(value??'');
		let fallback=(reason)=>{
			console.warn('Assistant response rejected:', reason, raw);
			return new AssistantResponse({reply: `
回應格式不正確，未執行任何方法。原始回應：
${raw}
`}, false);
		};
		let match=raw.match(/^\s*(\{[\s\S]*\})\s*$/)||raw.match(/^\s*\x60{3}json\s*\n\s*(\{[\s\S]*\})\s*\n\x60{3}\s*$/i);
		if (!match) {
			return fallback('Expected a JSON object.');
		}
		let characters=[];
		let inside=false;
		let escaped=false;
		for (let character of match[1]) {
			if (inside&&!escaped&&(character==='\n'||character==='\r'||character==='\t')) {
				characters.push(character==='\n'?'\\n':character==='\r'?'\\r':'\\t');
				continue;
			}
			characters.push(character);
			if (escaped) {
				escaped=false;
			}
			else if (inside&&character==='\\') {
				escaped=true;
			}
			else if (character==='"') {
				inside=!inside;
			}
		}
		let parsed=null;
		try { parsed=JSON.parse(characters.join('')); }
		catch (error) { return fallback(error); }
		if (!parsed||'object'!==typeof parsed||Array.isArray(parsed)) return fallback('Expected a JSON object.');
		let hasMethod=parsed.MethodName!==undefined&&parsed.MethodName!==null;
		if (hasMethod) {
			if ('string'!==typeof parsed.MethodName||!parsed.MethodName.trim()
				||!parsed.Arguments||'object'!==typeof parsed.Arguments||Array.isArray(parsed.Arguments)
				||parsed.reply!==undefined&&'string'!==typeof parsed.reply) return fallback('Unexpected response fields.');
		}
		else if ('string'!==typeof parsed.reply||!parsed.reply.trim()) return fallback('Unexpected response fields.');
		return new AssistantResponse(parsed, true);
	};
	_['public'].RequestResponse=async function (prompt, options) {
		let response=await Flow.generate.text(prompt, options);
		let parsed=_(this).ReadResponse(response?.text);
		if (parsed.IsValid) {
			return parsed;
		}
		try {
			let correction=`
${prompt}
上一則回應原文：
${String(response?.text??'')}
請保留原本的意圖，重新輸出可由 JSON.parse 解析的單一 JSON 物件。要呼叫方法時，MethodName 為完整方法名稱，Arguments 為參數物件；reply 可同時提供，會先傳給對話另一方。一般回答使用 reply。
`;
			let retry=await Flow.generate.text(correction, options);
			return _(this).ReadResponse(retry?.text);
		}
		catch (error) {
			console.error('Assistant response correction failed:', error);
			return parsed;
		}
	};
	_['public'].Consult=async function (getRequest, turn) {
		let $this=_(this);
		let completed=[];
		let lastResult=null;
		while (!turn?.signal.aborted) {
			let request=await getRequest(completed);
			let response=await this.RequestResponse(request.Prompt, request.Options);
			if (turn?.signal.aborted) return null;
			if (!response.IsValid||!response.MethodName) {
				return $this.m_methods.CompleteResponse(lastResult, response.Reply);
			}
			if (response.Reply.trim()) this.Reply(new Response(response.Reply));
			if (turn?.signal.aborted) return null;
			try {
				lastResult=await $this.m_methods.Invoke(response.MethodName, response.Arguments);
				completed.push(new MethodExecution(response.MethodName, lastResult, null));
			}
			catch (error) {
				console.error('Method failed:', error);
				lastResult=null;
				completed.push(new MethodExecution(response.MethodName, null, error?.message||String(error)));
			}
		}
		return null;
	};
	_['public'].GetInstruction=function (runtime, methods) {
		return `
你是 Assistant。請依對話另一方本輪使用的語言回答，並根據實際結果處理要求。
目前能力：${runtime}
可用方法：${methods}
回覆格式為單一標準 JSON 物件。一般回覆 {"reply":"給對話另一方看的文字"}；執行方法時回覆 {"reply":"要先告訴對話另一方的文字","MethodName":"類型.方法","Arguments":{}}，reply 可以省略。
MethodName 使用現有類型與其方法的完整名稱；Arguments 是該方法的參數物件，原碼等長文字作為字串放在 Arguments 中。字串內的換行以 JSON 的 \\n 表示。
有 reply 時會先傳給對話另一方，接著執行方法。方法結果會交還給你，依結果選擇下一個方法或回覆已完成的事項。
`;
	};
	_['protected'].GetRequest=async function (message, completed) {
		let methods=_(this).m_methods;
		let runtime=methods.Modules.InspectRuntime({}).Message;
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
		await _(this).m_ready;
		let result=await this.Consult((completed)=>_(this).GetRequest(message, completed), turn);
		if (result) this.Reply(result);
	};
	_['protected'].NotifyAssistant=async function (event, details, attachment) {
		try {
			let $this=_(this);
			await $this.m_ready;
			let recent=this.GetMessages().map((entry)=>`${entry.Sender}: ${entry.Text}`).join('\n');
			let prompt=`
最近對話：
${recent}
事件：${event}
實際結果：${JSON.stringify(details)}
請依目前對話語言，根據實際結果回答。
`;
			let options={systemInstruction: this.GetInstruction('', '')};
			let request=new AssistantRequest(prompt, options);
			let result=await this.Consult((completed)=>this.GetMethods().GetContinuation(request, completed), null);
			if (attachment) result.Attachment=$this.m_methods.NormalizeAttachment(attachment);
			this.Reply(result);
		}
		catch (error) { this.ReportError(error); }
	};
	_['protected'].m_conversation=null;
	_['protected'].m_methods=null;
	_['protected'].m_listeners=null;
	_['protected'].m_activeTurn=null;
	_['protected'].m_ready=null;
});
