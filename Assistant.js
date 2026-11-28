var Assistant=Function.extend(Object, function () {
	var _=this(Assistant);
	Assistant=_[Assistant];
	function Assistant(methods) {
		_['base'].apply(this, arguments);
		_(this).m_methods=methods;
	}
	_['public'].GetMethods=function () { return _(this).m_methods; };
	_['public'].RequestResponse=async function (prompt, options, signal) {
		let request=prompt;
		while (!signal?.aborted) {
			let raw=(await Flow.generate.text(request, options))?.text;
			console.log('Assistant response:', raw);
			if (signal?.aborted) return null;
			let invalid=null;
			let value;
			try { value=JSON.parse(raw); }
			catch (error) { invalid=error; }
			if (!invalid) {
				let method=value?.MethodName;
				let hasMethod='string'===typeof method&&!!method.trim();
				let validMethod=method==null||hasMethod;
				let validReply=hasMethod?(value.reply==null||'string'===typeof value.reply):('string'===typeof value?.reply&&!!value.reply.trim());
				if (value&&'object'===typeof value&&!Array.isArray(value)&&validMethod&&validReply) {
					return new AssistantResponse(value);
				}
				invalid='Expected a JSON object with a nonempty reply or a MethodName.';
			}
			console.warn('Invalid assistant response:', invalid, raw);
			request=`
${prompt}
上一則回應：
${String(raw??'')}
一般回覆請提供非空的 reply；呼叫方法時提供 MethodName 與 Arguments，reply 可以省略。請重新產生單一標準 JSON 物件。
`;
		}
		return null;
	};
	_['public'].Consult=async function (getRequest, turn, reply, complete) {
		let $this=_(this);
		let completed=[];
		let lastResult=null;
		while (!turn?.signal.aborted) {
			let request=await getRequest(completed);
			let response=await this.RequestResponse(request.Prompt, request.Options, turn?.signal);
			if (turn?.signal.aborted) return null;
			if (!response) return null;
			if (!response.MethodName) {
				complete?.(response, lastResult);
				return;
			}
			if (response.Reply.trim()) reply(response);
			if (turn?.signal.aborted) return null;
			try {
				lastResult=await $this.m_methods.Invoke(response.MethodName, response.Arguments, lastResult);
				completed.push(`
${response.MethodName} 的實際回傳：
${_(this).GetResultText(lastResult)}
`);
			}
			catch (error) {
				console.error('Method failed:', error);
				lastResult=null;
				completed.push(`
${response.MethodName} 執行失敗：
${error?.message||String(error)}
`);
			}
		}
		return null;
	};
	_['protected'].GetResultText=function (value) {
		if ('string'===typeof value) return value;
		try { return JSON.stringify(value)??String(value); }
		catch (error) {
			console.error('Unable to serialize method result:', error);
			return String(value);
		}
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
	_['protected'].GetRequest=async function (message, completed, messages) {
		let methods=_(this).m_methods;
		let runtime=methods.Modules.InspectRuntime({});
		return methods.GetRequest(message, completed, messages, this.GetInstruction(runtime, methods.GetInstruction()));
	};
	_['public'].Process=function (message, messages, turn, reply) {
		return this.Consult((completed)=>_(this).GetRequest(message, completed, messages), turn, reply,
			(response, result)=>reply(response, _(this).m_methods.GetAttachment(result)));
	};
	_['protected'].m_methods=null;
});
