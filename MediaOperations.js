var MediaOperations=Function.extend(Object, function () {
	var _=this(MediaOperations);
	MediaOperations=_[MediaOperations];

	function MediaOperations(media, notify, changed) {
		_['base'].apply(this, arguments);
		_(this).m_media=media;
		_(this).m_notify=notify;
		_(this).m_changed=changed;
		_(this).m_generating=false;
	}
	_['public'].GetMedia=function () { return _(this).m_media; };
	_['public'].IsGenerating=function () { return _(this).m_generating; };
	_['public'].NotifyAssistant=function (event, details, image) { return _(this).m_notify(event, details, image); };
	_['public'].UpdateMedia=function (patch) {
		_(this).m_media.Apply(patch);
		_(this).m_changed();
	};

	_['public'].ToLegacyMedia=async function (media) {
		if (!media) return null;
		return {...media.toJSON(), base64: media.Data?await media.ToBase64():undefined};
	};

	_['public'].GetImageInfo=async function () {
		let $this=_(this);
		let image=$this.m_media.GetActiveMedia();
		if (!(image instanceof Media.Image)) return null;
		let dimensions=image.Width&&image.Height?{width: image.Width, height: image.Height}:await new ImageService().GetDimensions(await $this.ToLegacyMedia(image));
		return {...dimensions, mimeType: image.MimeType, title: image.Title};
	};

	_['public'].SetRatio=function (value) {
		if (!['original', '1:1', '16:9', '9:16', '4:3', '3:4'].includes(value)) throw new Error('Unsupported aspect ratio.');
		this.UpdateMedia({selectedRatio: value});
	};
	_['public'].SelectVersion=function (id) {
		let $this=_(this);
		let media=$this.m_media.History.find((item)=>item.Id===id);
		if (!media) throw new Error('Media version not found: '+id);
		$this.UpdateMedia({activeMedia: media, currentMedia: media});
	};
	_['public'].PickMedia=function () { return this.SelectMedia(); };
	_['public'].SelectMedia=async function () {
		let $this=_(this);
		try {
			let image=await new ImageService().Select();
			if (!image) return;
			$this.UpdateMedia({activeMedia: image, currentMedia: image, history: [image, ...$this.m_media.History]});
			await this.NotifyAssistant('Media selected', {Title: image.title, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('Operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].CaptureCamera=async function () {
		let $this=_(this);
		try {
			let image=await new ImageService().Capture();
			if (!image) return;
			$this.UpdateMedia({activeMedia: image, currentMedia: image, history: [image, ...$this.m_media.History]});
			await this.NotifyAssistant('Camera image captured', {Title: image.title, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('Operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].Generate=async function (prompt) {
		let $this=_(this);
		let media=$this.m_media;
		let text=String(prompt||media.GetPrompt()).trim();
		if (!text||$this.m_generating) return;
		$this.m_generating=true;
		$this.m_changed();
		try {
			let generated=await new ImageService().Generate(text, media.GetActiveMedia() instanceof Media.Image?await $this.ToLegacyMedia(media.GetActiveMedia()):null, media.GetRatio(), media.History.length+1);
			let image=generated.Image;
			$this.UpdateMedia({activeMedia: image, currentMedia: image, history: [image, ...media.History]});
			await this.NotifyAssistant('Image generation completed', {Title: image.title, Prompt: text, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('Operation failed', {Error: error.message||String(error)}); }
		finally { $this.m_generating=false; $this.m_changed(); }
	};

	_['public'].Download=async function () {
		let $this=_(this);
		try {
			let media=$this.m_media.GetActiveMedia();
			if (media instanceof Media.Video) await new VideoService().Download(await $this.ToLegacyMedia(media));
			else if (media instanceof Media.Image) await new ImageService().Download(await $this.ToLegacyMedia(media));
		}
		catch (error) { await this.NotifyAssistant('Operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].GenerateVideo=async function (args={}, context={}) {
		let image=context.image;
		if ((args.useCurrentImageAsFirstFrame||args.useCurrentImageAsReference)&&!image) throw new Error('No current image is available.');
		if (args.useCurrentImageAsFirstFrame&&args.firstFrameImageMediaId) throw new Error('Choose one first-frame image.');
		let references=args.referenceImageMediaIds||[];
		if (!Array.isArray(references)) throw new Error('Reference image media IDs must be an array.');
		let artifact=await new VideoService().Generate({
			prompt: args.prompt
			, aspectRatio: args.aspectRatio
			, durationSeconds: args.durationSeconds
			, resolution: args.resolution
			, firstFrameImage: args.useCurrentImageAsFirstFrame?image:args.firstFrameImageMediaId
			, referenceImages: args.useCurrentImageAsReference?[image, ...references]:references
			, sourceVideoMediaId: args.sourceVideoMediaId
		});
		return {message: `Video generated and saved to Flow Assets (${artifact.mediaId}).`, artifact};
	};


	_['public'].GetInstruction=function () { return "產生影片時使用 MethodName: MediaOperations.GenerateVideo，Arguments 為 {prompt,aspectRatio,durationSeconds,resolution}；aspectRatio 為 16:9 或 9:16，durationSeconds 為 3 至 15，resolution 為 720p 或 360p。可選 useCurrentImageAsFirstFrame: true 作為首幀，或 useCurrentImageAsReference: true 作為參考；也可傳 firstFrameImageMediaId、referenceImageMediaIds，或 sourceVideoMediaId 作為影片編輯來源。首幀不得與參考圖或來源影片同時使用。完成後影片自動存入 Flow Assets。\n若有待使用者確認的影像生成提示詞，回覆同一 JSON 物件的 suggestedPrompt、aspectRatio。"; };
	_['public'].Receive=async function (value, methodName, context) {
		let output=null;
		let message=null;
		if (value instanceof Media) output=value;
		else if (value&&'object'===typeof value&&'artifact' in value) {
			output=value.artifact;
			message=value.message;
			if (!output||'object'!==typeof output) throw new Error('A media result needs content and a MIME type.');
			if (!(output instanceof Media)&&!output.data&&!output.base64&&output.mediaId) {
				let content=await Flow.media.getBase64({mediaId: output.mediaId});
				output={...output, ...content, mediaId: output.mediaId};
			}
			if (!(output instanceof Media)&&(!output.mimeType||!output.base64&&!(output.data instanceof Blob))) {
				throw new Error('A media result needs content and a MIME type.');
			}
			if (!(output instanceof Media)&&/^image\//.test(output.mimeType)&&output.base64) {
				output=await new ImageService().ReadMethodResult({image: output}, context.image, methodName);
			}
		}
		else if (value&&'object'===typeof value&&'image' in value) {
			output=await new ImageService().ReadMethodResult(value, context.image, methodName);
			message=value.message;
		}
		else if (value?.base64&&/^image\//.test(value.mimeType)) {
			output=await new ImageService().ReadMethodResult(value, context.image, methodName);
		}
		if (output) {
			let media=this.GetMedia();
			let artifact=media.ToMedia(output);
			if (artifact instanceof Media.Image||artifact instanceof Media.Video) {
				this.UpdateMedia({activeMedia: artifact, currentMedia: artifact, history: [artifact, ...media.History]});
			}
			else this.UpdateMedia({currentMedia: artifact});
			return {message: 'string'===typeof message?message:methodName+' 已完成。', artifact};
		}
		if (value&&'string'===typeof value.message) return value;
		return {message: methodName+'：'+String('string'===typeof value?value:JSON.stringify(value)??'已完成').slice(0,12000)};
	};
	_['public'].GetRequestContext=async function () {
		let selected=this.GetMedia().GetActiveMedia();
		let artifact=this.GetMedia().GetCurrentMedia();
		let imageInfo=selected instanceof Media.Image?await this.GetImageInfo():null;
		let text=selected||artifact?'目前影像：'+(imageInfo?imageInfo.width+' × '+imageInfo.height+' ('+imageInfo.mimeType+')':'無')+'；目前產物：'+JSON.stringify(this.Describe(artifact))+'；選定比例：'+this.GetMedia().GetRatio():'';
		let images=[];
		if (selected instanceof Media.Image) {
			let image=await this.ToLegacyMedia(selected);
			images=[{base64: image.base64, mimeType: image.mimeType}];
		}
		return {Text: text, Images: images};
	};
	_['public'].Describe=function (media) {
		if (!media) return null;
		return {type: media instanceof Media.Image?'image':media instanceof Media.Video?'video':'media',
			id: media.Id, title: media.Title, mimeType: media.MimeType, mediaId: media.MediaId,
			...(media instanceof Media.Image?{width: media.Width, height: media.Height}:{}),
			...(media instanceof Media.Video?{durationSeconds: media.DurationSeconds, resolution: media.Resolution}:{})};
	};
	_['public'].ApplyResponse=function (responses, artifact) {
		let media=this.GetMedia(), prompt=media.GetPrompt(), ratio=media.GetRatio(), changed=false;
		for (let response of responses) {
			if ('string'===typeof response.suggestedPrompt) { prompt=response.suggestedPrompt; changed=true; }
			if (['original', '1:1', '16:9', '9:16', '4:3', '3:4'].includes(response.aspectRatio)) { ratio=response.aspectRatio; changed=true; }
		}
		if (changed) this.UpdateMedia({generationPrompt: prompt, selectedRatio: ratio});
		let current=artifact||media.GetCurrentMedia();
		let attachment=artifact instanceof Media.Image||artifact instanceof Media.Video?artifact:current instanceof Media.Video?current:null;
		return {attachment};
	};
	_['protected'].m_media=null;
	_['protected'].m_notify=null;
	_['protected'].m_changed=null;
	_['protected'].m_generating=false;
});
