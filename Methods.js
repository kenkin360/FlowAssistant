var Methods=Function.extend(Object, function () {
	var _=this(Methods);
	Methods=_[Methods];
	function Methods(sourceUrl, notify, changed) {
		_['base'].apply(this, arguments);
		this.Sources=new Sources(sourceUrl);
		this.Modules=new Modules(this.Sources);
		let media=new MediaWorkspace(changed);
		this.ImageService=new ImageService(media, notify);
		this.VideoService=new VideoService(media);
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
	_['public'].GetAttachment=function (value) {
		return value instanceof Media.Image||value instanceof Media.Video?value:null;
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
		let output=value instanceof Media?value:value?.artifact??value?.image??value;
		if (output&&'object'===typeof output&&!(output instanceof Media)&&output.mediaId&&output.mimeType&&!output.data&&!output.base64) {
			let content=await Flow.media.getBase64({mediaId: output.mediaId});
			output={...output, ...content, mediaId: output.mediaId};
		}
		if (output instanceof Media||output?.mimeType&&(output.base64||output.data instanceof Blob)) {
			if (!(output instanceof Media)) {
				output=/^image\//.test(output.mimeType)&&output.base64
					?await this.ImageService.ReadImageOutput(output, input?.image, methodName)
					:this.ImageService.GetWorkspace().ToMedia(output);
			}
			if (output) {
				this.ImageService.GetWorkspace().Add(output);
				return output;
			}
		}
		return value;
	};
	_['public'].NormalizeAttachment=function (value) { return this.ImageService.GetWorkspace().ToMedia(value); };
	_['public'].Sources=null;
	_['public'].Modules=null;
	_['public'].ImageService=null;
	_['public'].VideoService=null;
});
