var ActionExecutor=Function.extend(Object, function () {
	var _=this(ActionExecutor);
	ActionExecutor=_[ActionExecutor];
	function ActionExecutor(modules, mediaOperations, inspect) {
		_['base'].apply(this, arguments);
		_(this).m_modules=modules;
		_(this).m_mediaOperations=mediaOperations;
		_(this).m_inspect=inspect;
	}
	_['public'].GetMedia=function () { return _(this).m_mediaOperations.GetMedia(); };
	_['public'].RunAction=async function (action, track=true, source, Type) {
		let $this=_(this);
		await $this.m_modules.GetStartup();
		let media=$this.GetMedia();
		let image=media.GetActiveMedia() instanceof Media.Image?await $this.m_mediaOperations.ToLegacyMedia(media.GetActiveMedia()):null;
		let artifact=media.GetCurrentMedia()===media.GetActiveMedia()&&image?image:await $this.m_mediaOperations.ToLegacyMedia(media.GetCurrentMedia());
		let result=await $this.ExecuteAction(action, {image, artifact, track, source, Type});
		if (result.artifact) {
			let output=media.ToMedia(result.artifact);
			if (output instanceof Media.Image||output instanceof Media.Video) {
				$this.m_mediaOperations.UpdateMedia({activeMedia: output, currentMedia: output, history: [output, ...media.History]});
			}
			else $this.m_mediaOperations.UpdateMedia({currentMedia: output});
			result.artifact=output;
		}
		return result;
	};

	_['protected'].ResolveAction=function (name) {
		let modules=_(this).m_modules;
		switch (name) {
			case 'readCompiledSource': return (args)=>modules.GetSources().ReadCompiledSource(args);
			case 'readRemoteSource': return (args)=>modules.GetSources().ReadRemoteSource(args);
			case 'readInstalledSource': return (args)=>modules.GetSources().ReadInstalledSource(args);
			case 'inspectRuntime': return (args)=>_(this).m_inspect(args);
			case 'loadModule': return (args, context)=>modules.LoadModule(context.source, {name: args.name, Type: context.Type, readyMember: args.readyMember, track: context.track});
			case 'rollback': return ()=>({message: modules.Rollback()});
			case 'generateVideo': return (args, context)=>_(this).m_mediaOperations.GenerateVideo(args, context);
			default: return modules.GetRuntime().Modules[name]?.Run;
		}
	};
	_['protected'].ExecuteAction=async function (action, context) {
		if (!action?.arguments||'object'!==typeof action.arguments||Array.isArray(action.arguments)) throw new Error('Action arguments must be an object.');
		let callback=_(this).ResolveAction(action.name);
		if ('function'!==typeof callback) throw new Error('Runtime function not found: '+String(action.name));
		let value=await callback(action.arguments, context);
		if (value instanceof Media) return {message: `${action.name} completed.`, artifact: value};
		if (undefined!==value?.artifact) {
			let artifact=value.artifact;
			if (!artifact||'object'!==typeof artifact) throw new Error('An action media result needs file content and a MIME type.');
			if (!(artifact instanceof Media)&&!artifact.data&&!artifact.base64&&artifact.mediaId) {
				let content=await Flow.media.getBase64({mediaId: artifact.mediaId});
				artifact={...artifact, ...content, mediaId: artifact.mediaId};
			}
			if (!(artifact instanceof Media)&&(!artifact.mimeType||!artifact.base64&&!(artifact.data instanceof Blob))) {
				throw new Error('An action media result needs file content and a MIME type.');
			}
			if (!(artifact instanceof Media)&&/^image\//.test(artifact.mimeType)&&artifact.base64) {
				let image=await new ImageService().ReadActionResult({image: artifact}, context.image, action.name);
				if (!image) throw new Error('An image result needs supported image content.');
				return {message: 'string'===typeof value.message?value.message:`${action.name} updated the current image.`, artifact: image, image};
			}
			return {message: 'string'===typeof value.message?value.message:`${action.name} completed.`, artifact};
		}
		let imageValue=value&&'object'===typeof value&&'image' in value?value.image:value;
		if ('string'===typeof imageValue?.base64&&/^image\//.test(imageValue.mimeType)) {
			let image=await new ImageService().ReadActionResult(value, context.image, action.name);
			if (image) return {message: 'string'===typeof value.message?value.message:`${action.name} updated the current image.`, artifact: image, image};
		}
		if (value&&'string'===typeof value.message) return value;
		return {message: `${action.name}: ${('string'===typeof value?value:JSON.stringify(value)??'completed').slice(0,12000)}`};
	};


	_['protected'].m_modules=null;
	_['protected'].m_mediaOperations=null;
	_['protected'].m_inspect=null;
});
