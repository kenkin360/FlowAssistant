var Methods=Function.extend(Object, function () {
	var _=this(Methods);
	Methods=_[Methods];
	function Methods(sourceUrl, conversation, notify, changed) {
		_['base'].apply(this, arguments);
		this.Sources=new Sources(sourceUrl);
		this.Modules=new Modules(this.Sources);
		this.ImageService=new ImageService(new MediaWorkspace(changed), notify);
		this.VideoService=new VideoService();
		this.Conversation=conversation;
	}
	_['public'].GetInstruction=function () {
		return this.Modules.GetInstruction()+'\n'+this.ImageService.GetInstruction()+'\n'+this.VideoService.GetInstruction();
	};
	_['public'].GetRequest=async function (message, completed, messages, instruction) {
		let prior=messages.slice();
		if (prior.at(-1)?.Sender==='user'&&prior.at(-1)?.Text===message) prior.pop();
		let history=prior.slice(-20).map((entry)=>entry.Sender+': '+entry.Text).join('\n\n');
		let context=await this.ImageService.GetRequestContext();
		let prompt=context.Text+'\n先前對話：\n'+history+'\n本輪要求：\n'+message;
		if (completed.length) {
			prompt+='\n已完成的方法與實際結果：\n'+completed.map(JSON.stringify).join('\n')+'\n請依這些結果決定是否需要下一個方法，或直接回答使用者。';
		}
		let options={systemInstruction: instruction};
		if (context.Images.length) options.images=context.Images;
		return {Prompt: prompt, Options: options};
	};
	_['public'].Invoke=async function (methodName, args={}) {
		if ('string'!==typeof methodName||!/^[A-Za-z_$][\w$]*\.[A-Za-z_$][\w$]*$/.test(methodName)||methodName.endsWith('.constructor')) {
			throw new Error('MethodName must identify an existing method on a type.');
		}
		let [owner, name]=methodName.split('.');
		let target=Object.prototype.hasOwnProperty.call(this, owner)?this[owner]:this.Modules.GetRuntime().Modules[owner];
		let method=target?.[name];
		let prototype=target&&Object.getPrototypeOf(target);
		if (!target||'function'!==typeof method||!Object.prototype.hasOwnProperty.call(target, name)&&!Object.prototype.hasOwnProperty.call(prototype, name)) {
			throw new Error('Method not found: '+methodName);
		}
		await this.Modules.GetStartup();
		let needsMedia=!Object.prototype.hasOwnProperty.call(this, owner)||owner==='VideoService'&&name==='Generate'&&(args.useCurrentImageAsFirstFrame||args.useCurrentImageAsReference);
		let media=this.ImageService.GetWorkspace();
		let selected=media.GetActiveMedia();
		let image=needsMedia&&selected instanceof Media.Image?await media.GetLegacyMedia(selected):null;
		let artifact=needsMedia?(media.GetCurrentMedia()===selected&&image?image:await media.GetLegacyMedia(media.GetCurrentMedia())):null;
		let context={image, artifact, track: true};
		let value=await method.call(target, args, context);
		let output=null;
		let message=value?.message;
		if (value instanceof Media) output=value;
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
				output=await this.ImageService.ReadMethodResult({image: output}, image, methodName);
			}
		}
		else if (value&&'object'===typeof value&&'image' in value) {
			output=value.image?.mediaId?value.image:await this.ImageService.ReadMethodResult(value, image, methodName);
		}
		else if (value?.base64&&/^image\//.test(value.mimeType)) {
			output=await this.ImageService.ReadMethodResult(value, image, methodName);
		}
		if (output) {
			let result=media.Add(output);
			return {message: 'string'===typeof message?message:methodName+' 已完成。', artifact: result};
		}
		if (value&&'string'===typeof message) return value;
		return {message: methodName+'：'+String('string'===typeof value?value:JSON.stringify(value)??'已完成').slice(0,12000)};
	};
	_['public'].CompleteResponse=function (reply, responses, result) {
		this.ImageService.ApplySuggestions(responses);
		let workspace=this.ImageService.GetWorkspace();
		let current=result?.artifact||workspace.GetCurrentMedia();
		let attachment=result?.artifact instanceof Media.Image||result?.artifact instanceof Media.Video?result.artifact:current instanceof Media.Video?current:null;
		return {attachment};
	};
	_['public'].NormalizeAttachment=function (value) { return this.ImageService.GetWorkspace().ToMedia(value); };
	_['public'].DescribeResult=function (result) {
		return {result: result.message, ...(result.artifact?{artifact: this.ImageService.GetWorkspace().Describe(result.artifact)}:{})};
	};
	_['public'].Sources=null;
	_['public'].Modules=null;
	_['public'].ImageService=null;
	_['public'].VideoService=null;
	_['public'].Conversation=null;
});
