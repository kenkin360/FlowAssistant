var Methods=Function.extend(Object, function () {
	var _=this(Methods);
	Methods=_[Methods];
	function Methods(sourceUrl, conversation, notify, changed) {
		_['base'].apply(this, arguments);
		this.Sources=new Sources(sourceUrl);
		this.Modules=new Modules(this.Sources);
		this.MediaOperations=new MediaOperations(new MediaWorkspace(), notify, changed);
		this.Conversation=conversation;
	}
	_['public'].GetInstruction=function () {
		return this.Modules.GetInstruction()+'\n'+this.MediaOperations.GetInstruction();
	};
	_['public'].GetRequest=async function (message, completed, messages, instruction) {
		let prior=messages.slice();
		if (prior.at(-1)?.Sender==='user'&&prior.at(-1)?.Text===message) prior.pop();
		let history=prior.slice(-20).map((entry)=>entry.Sender+': '+entry.Text).join('\n\n');
		let context=await this.MediaOperations.GetRequestContext();
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
		let needsMedia=!Object.prototype.hasOwnProperty.call(this, owner)||owner==='MediaOperations'&&name==='GenerateVideo'&&(args.useCurrentImageAsFirstFrame||args.useCurrentImageAsReference);
		let media=this.MediaOperations.GetMedia();
		let selected=media.GetActiveMedia();
		let image=needsMedia&&selected instanceof Media.Image?await this.MediaOperations.ToLegacyMedia(selected):null;
		let artifact=needsMedia?(media.GetCurrentMedia()===selected&&image?image:await this.MediaOperations.ToLegacyMedia(media.GetCurrentMedia())):null;
		let context={image, artifact, track: true};
		let value=await method.call(target, args, context);
		return this.MediaOperations.Receive(value, methodName, context);
	};
	_['public'].CompleteResponse=function (reply, responses, result) {
		return this.MediaOperations.ApplyResponse(responses, result?.artifact);
	};
	_['public'].NormalizeAttachment=function (value) { return this.MediaOperations.GetMedia().ToMedia(value); };
	_['public'].DescribeResult=function (result) {
		return {result: result.message, ...(result.artifact?{artifact: this.MediaOperations.Describe(result.artifact)}:{})};
	};
	_['public'].Sources=null;
	_['public'].Modules=null;
	_['public'].MediaOperations=null;
	_['public'].Conversation=null;
});
