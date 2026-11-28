var Methods=Function.extend(Object, function () {
	var _=this(Methods);
	Methods=_[Methods];
	function Methods(sourceUrl, conversation, notify, changed) {
		_['base'].apply(this, arguments);
		this.Sources=new Sources(sourceUrl);
		this.Modules=new Modules(this.Sources);
		let media=new MediaWorkspace(changed);
		this.ImageService=new ImageService(media, notify);
		this.VideoService=new VideoService(media);
		this.Conversation=conversation;
	}
	_['public'].GetInstruction=function () {
		return `
${this.Modules.GetInstruction()}
${this.ImageService.GetInstruction()}
${this.VideoService.GetInstruction()}
`;
	};
	_['public'].GetRequest=async function (message, completed, messages, instruction) {
		let prior=messages.slice();
		if (prior.at(-1)?.Sender==='user'&&prior.at(-1)?.Text===message) prior.pop();
		let history=prior.map((entry)=>`${entry.Sender}: ${entry.Text}`).join('\n\n');
		let context=await this.ImageService.GetRequestContext();
		let prompt=`
${context.Text}
先前對話：
${history}
本輪要求：
${message}
`;
		let options={systemInstruction: instruction};
		if (context.Images.length) options.images=context.Images;
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
	_['public'].Invoke=async function (methodName, args) {
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
		let input=local?undefined:await this.ImageService.GetLegacyModuleInput();
		let value=await method.call(target, args, input);
		let image=input?.image??null;
		let output=null;
		let message=value instanceof MethodResult?value.Message:value?.message;
		if (value instanceof Media) output=value;
		else if (value instanceof MethodResult) output=value.Artifact;
		else if (value&&'object'===typeof value&&'artifact' in value) {
			output=value.artifact;
			if (!output||'object'!==typeof output) throw new Error('A media result needs content and a MIME type.');
			if (!(output instanceof Media)&&!output.data&&!output.base64&&output.mediaId) {
				let content=await Flow.media.getBase64({mediaId: output.mediaId});
				output={...output, ...content, mediaId: output.mediaId};
			}
			if (!(output instanceof Media)&&(!output.mimeType||!output.base64&&!(output.data instanceof Blob))) {
				throw new Error('A media result needs content and a MIME type.');
			}
			if (!(output instanceof Media)&&/^image\//.test(output.mimeType)&&output.base64) {
				output=await this.ImageService.ReadMethodResult(output, image, methodName);
			}
		}
		else if (value&&'object'===typeof value&&'image' in value) {
			output=value.image?.mediaId?value.image:await this.ImageService.ReadMethodResult(value, image, methodName);
		}
		else if (value?.base64&&/^image\//.test(value.mimeType)) {
			output=await this.ImageService.ReadMethodResult(value, image, methodName);
		}
		if (output) {
			let result=this.ImageService.GetWorkspace().Add(output);
			return new MethodResult('string'===typeof message?message:`
${methodName} 已完成。
`, result);
		}
		if (value instanceof MethodResult) return value;
		if (value&&'string'===typeof message) return new MethodResult(message, null);
		return new MethodResult(`
${methodName}：${String('string'===typeof value?value:JSON.stringify(value)??'已完成')}
`, null);
	};
	_['public'].CompleteResponse=function (result, reply) {
		let workspace=this.ImageService.GetWorkspace();
		let current=result?.Artifact||workspace.GetCurrentMedia();
		let attachment=result?.Artifact instanceof Media.Image||result?.Artifact instanceof Media.Video?result.Artifact:current instanceof Media.Video?current:null;
		return new ConversationResponse(reply, attachment);
	};
	_['public'].NormalizeAttachment=function (value) { return this.ImageService.GetWorkspace().ToMedia(value); };
	_['public'].Sources=null;
	_['public'].Modules=null;
	_['public'].ImageService=null;
	_['public'].VideoService=null;
	_['public'].Conversation=null;
});
