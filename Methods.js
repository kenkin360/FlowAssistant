var Methods=Function.extend(Object, function () {
	var _=this(Methods);
	Methods=_[Methods];
	function Methods(sourceUrl, moduleAdapter) {
		_['base'].apply(this, arguments);
		this.Sources=new Sources(sourceUrl);
		this.Modules=new Modules(this.Sources);
		_(this).m_moduleAdapter=moduleAdapter??null;
	}
	_['public'].GetInstruction=function () {
		return `
${Object.values(this).filter((value)=>'function'===typeof value?.GetInstruction).map((value)=>value.GetInstruction()).join('\n')}
`;
	};
	_['public'].GetRequest=async function (message, completed, messages, instruction) {
		let prior=messages.filter((entry)=>entry!==message);
		let history=prior.map((entry)=>{
			let attachment=entry.Attachment?`
附件：${JSON.stringify(entry.Attachment)}
`:'';
			return `${entry.Sender}: ${entry.Text}${attachment}`;
		}).join('\n\n');
		let attachment=message.Attachment?`
本輪附件：${JSON.stringify(message.Attachment)}
`:'';
		let prompt=`
先前對話：
${history}
本輪要求：
${message.Text}
${attachment}
`;
		let options={systemInstruction: instruction};
		Object.assign(options, await _(this).m_moduleAdapter?.GetRequestOptions?.(message.Attachment));
		return this.GetContinuation(new AssistantRequest(prompt, options), completed);
	};
	_['public'].GetContinuation=function (request, completed) {
		if (!completed.length) return request;
		return new AssistantRequest(`
${request.Prompt}
已完成的方法與實際結果：
${completed.map(JSON.stringify).join('\n')}
請依這些結果決定是否需要下一個方法，或根據結果回答。
`, request.Options);
	};
	_['public'].GetAttachment=function (value) {
		return _(this).m_moduleAdapter?.GetAttachment?.(value)??null;
	};
	_['public'].Invoke=async function (methodName, args, previousResult) {
		if ('string'!==typeof methodName||!/^[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*$/.test(methodName)||methodName.endsWith('.constructor')) {
			throw new Error('MethodName must identify an existing method on a type.');
		}
		let [owner, name]=methodName.split('.');
		let local=Object.prototype.hasOwnProperty.call(this, owner);
		let target=local?this[owner]:this.Modules.GetRuntime().Modules[owner];
		let method=target?.[name];
		let prototype=target&&Object.getPrototypeOf(target);
		if (!target||'function'!==typeof method||!Object.prototype.hasOwnProperty.call(target, name)&&!Object.prototype.hasOwnProperty.call(prototype, name)) {
			throw new Error(`
Method not found: ${methodName}
`);
		}
		await this.Modules.GetStartup();
		let input=local?undefined:await _(this).m_moduleAdapter?.GetInvocationInput?.(previousResult);
		let value=await method.call(target, args, input);
		return _(this).m_moduleAdapter?.CompleteInvocation?_(this).m_moduleAdapter.CompleteInvocation(value, input, methodName):value;
	};
	_['public'].Sources=null;
	_['public'].Modules=null;
	_['public'].Conversation=null;
	_['protected'].m_moduleAdapter=null;
});
