var ImageService=Function.extend(Object, function () {
	var _=this(ImageService);
	ImageService=_[ImageService];

	function ImageService(workspace, notify) {
		_['base'].apply(this, arguments);
		_(this).m_workspace=workspace;
		_(this).m_notify=notify;
		_(this).m_generating=false;
	}
	ImageService.ModelDisplayName='🍌 Nano Banana 2.1';
	_['public'].GetWorkspace=function () { return _(this).m_workspace; };
	_['public'].GetInvocationInput=async function (previousResult) {
		let workspace=this.GetWorkspace();
		let selected=workspace.GetActiveMedia();
		let image=selected instanceof Media.Image?await workspace.GetLegacyMedia(selected):null;
		let current=previousResult??workspace.GetCurrentMedia();
		let media=current instanceof Media?current:this.GetAttachment(current);
		let artifact=media===selected&&image?image:media?await workspace.GetLegacyMedia(media):current;
		return {image, artifact};
	};
	_['public'].IsGenerating=function () { return _(this).m_generating; };
	_['public'].GetInstruction=function () {
		return '影像生成使用 MethodName: ImageService.Generate，Arguments 為 {prompt,aspectRatio}；可選 useCurrentImage: true 以目前選取的影像作參考。';
	};
	_['public'].GetRequestImages=async function (attachment) {
		if (!(attachment instanceof Media.Image)) return [];
		return [{base64: await attachment.ToBase64(), mimeType: attachment.MimeType}];
	};
	_['public'].GetRequestOptions=async function (attachment) {
		let images=await this.GetRequestImages(attachment);
		return images.length?{images}:null;
	};
	_['public'].GetAttachment=function (value) {
		if (value instanceof Media.Image||value instanceof Media.Video) return value;
		let media=value?.artifact;
		if (media instanceof Media.Image||media instanceof Media.Video) return media;
		media=value?.image;
		return media instanceof Media.Image||media instanceof Media.Video?media:null;
	};
	_['public'].CompleteInvocation=async function (value, input, methodName) {
		let member=value?.artifact!=null?'artifact':value?.image!=null?'image':null;
		let output=member?value[member]:value;
		if (output&&'object'===typeof output&&!(output instanceof Media)&&output.mediaId&&output.mimeType&&!output.data&&!output.base64) {
			let content=await Flow.media.getBase64({mediaId: output.mediaId});
			output={...output, ...content, mediaId: output.mediaId};
		}
		if (output instanceof Media||output?.mimeType&&(output.base64||output.data instanceof Blob)) {
			if (!(output instanceof Media)) {
				output=/^image\//.test(output.mimeType)&&output.base64
					?await this.ReadImageOutput(output, input?.image, methodName)
					:this.GetWorkspace().ToMedia(output);
			}
			if (output) {
				this.GetWorkspace().Add(output);
				if (member) {
					value[member]=output;
					return value;
				}
				return output;
			}
		}
		return value;
	};
	_['public'].SelectCurrent=async function () {
		try {
			let image=await this.Select();
			if (!image) return;
			this.GetWorkspace().Add(image);
			await _(this).m_notify('Media selected', image);
			return image;
		}
		catch (error) { console.error('Image operation failed:', error); await _(this).m_notify('Operation failed', error?.message||String(error)); }
	};
	_['public'].CaptureCurrent=async function () {
		try {
			let image=await this.Capture();
			if (!image) return;
			this.GetWorkspace().Add(image);
			await _(this).m_notify('Camera image captured', image);
			return image;
		}
		catch (error) { console.error('Image operation failed:', error); await _(this).m_notify('Operation failed', error?.message||String(error)); }
	};
	_['public'].GenerateCurrent=async function (options) {
		let $this=_(this);
		let workspace=this.GetWorkspace();
		let text=String(options.Prompt??'').trim();
		if (!text||$this.m_generating) return;
		$this.m_generating=true;
		workspace.NotifyChanged();
		try {
			let image=await this.Generate(options);
			workspace.Add(image);
			await $this.m_notify(`Image generation completed: ${text}`, image);
			return image;
		}
		catch (error) { console.error('Image generation failed:', error); await $this.m_notify('Operation failed', error?.message||String(error)); }
		finally { $this.m_generating=false; workspace.NotifyChanged(); }
	};
	_['public'].DownloadCurrent=async function () {
		try {
			let workspace=this.GetWorkspace();
			let selected=workspace.GetActiveMedia();
			if (selected instanceof Media.Image) return await this.Download(await workspace.GetLegacyMedia(selected));
			return null;
		}
		catch (error) { console.error('Image operation failed:', error); await _(this).m_notify('Operation failed', error?.message||String(error)); }
	};

	_['protected'].GetDimensions=async function (image) {
		if (Number.isInteger(image?.width)&&Number.isInteger(image?.height)&&image.width>0&&image.height>0) {
			return new Dimensions(image.width, image.height);
		}
		let source=new Image();
		source.src=`data:${image.mimeType};base64,${image.base64}`;
		await source.decode();
		if (!source.naturalWidth||!source.naturalHeight) throw new Error('Unable to read image dimensions.');
		return new Dimensions(source.naturalWidth, source.naturalHeight);
	};

	_['protected'].GetAspectRatio=function (dimensions) {
		let a=dimensions.Width;
		let b=dimensions.Height;
		while (b) [a, b]=[b, a%b];
		return `${dimensions.Width/a}:${dimensions.Height/a}`;
	};

	_['public'].ReadImageOutput=async function (value, image, methodName) {
		let output=value&&'object'===typeof value&&'image' in value?value.image:value;
		if (!output||'string'!==typeof output.base64||!/^image\//.test(output.mimeType)) return null;
		let dimensions=await _(this).GetDimensions(output);
		let original=image||{};
		return new Media.Image({
			id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
			, base64: output.base64, mimeType: output.mimeType, mediaId: undefined
			, width: dimensions.Width, height: dimensions.Height
			, title: output.title||`${original.title||'Image'} · ${methodName}`
		});
	};

	_['protected'].GetContent=async function (media) {
		if ('string'===typeof media?.base64&&media.base64&&'string'===typeof media.mimeType&&media.mimeType) return media;
		if (!media?.mediaId) throw new Error('The image has neither content nor a mediaId.');
		let content=await Flow.media.getBase64({mediaId: media.mediaId});
		if ('string'!==typeof content?.base64||!content.base64) throw new Error('Flow did not return the selected image content.');
		let mimeType=content.mimeType||media.mimeType;
		if (!mimeType) throw new Error('Flow did not return the selected image MIME type.');
		return {...media, ...content, mimeType};
	};

	_['public'].Select=async function () {
		let selected=await Flow.media.select({filter: 'image'});
		if (!selected) return null;
		selected=await _(this).GetContent(selected);
		let dimensions=await _(this).GetDimensions(selected);
		return new Media.Image({
			id: `img_${Date.now()}`
			, base64: selected.base64
			, mimeType: selected.mimeType
			, mediaId: selected.mediaId
			, width: dimensions.Width, height: dimensions.Height
			, title: selected.name||'匯入影像'
		});
	};

	_['public'].Capture=async function () {
		let flow=Flow;
		let photo=await flow.camera.capture({facingMode: 'user'});
		if (!photo) return null;
		let dimensions=await _(this).GetDimensions(photo);
		let upload=await flow.upload({
			base64: photo.base64
			, mimeType: 'image/png'
			, name: `Camera Capture ${new Date().toLocaleTimeString()}`
		});
		return new Media.Image({
			id: `cam_${Date.now()}`
			, base64: photo.base64
			, mimeType: photo.mimeType||'image/png'
			, mediaId: upload.mediaId
			, width: dimensions.Width, height: dimensions.Height
			, title: '相機拍照'
		});
	};

	_['public'].Generate=async function (options) {
		let flow=Flow;
		let request=options instanceof ImageGenerationRequest?options:new ImageGenerationRequest(options?.prompt, options?.aspectRatio, options?.useCurrentImage);
		let prompt=request.Prompt;
		let ratio=request.AspectRatio;
		let useCurrentImage=request.UseCurrentImage;
		if ('string'!==typeof prompt||!prompt.trim()) throw new Error('Provide an image prompt.');
		let workspace=this.GetWorkspace();
		let selected=useCurrentImage?workspace?.GetActiveMedia():null;
		if (useCurrentImage&&!(selected instanceof Media.Image)) throw new Error('No current image is available.');
		let image=selected?await workspace.GetLegacyMedia(selected):null;
		let index=(workspace?.History.length||0)+1;
		let mediaId=image?.mediaId;
		let aspectRatio=ratio==null||'original'===ratio?(image?_(this).GetAspectRatio(await _(this).GetDimensions(image)):undefined):ratio;
		if (image&&!mediaId) {
			let upload=await flow.upload({base64: image.base64, mimeType: image.mimeType, name: image.title});
			mediaId=upload.mediaId;
		}
		let result=await flow.generate.image({
			prompt
			, referenceImageMediaIds: mediaId?[mediaId]:undefined
			, aspectRatio
			, modelDisplayName: ImageService.ModelDisplayName
		});
		result=await _(this).GetContent(result);
		let dimensions=await _(this).GetDimensions(result);
		return new Media.Image({
				id: `ver_${Date.now()}`
				, base64: result.base64
				, mimeType: result.mimeType
				, mediaId: result.mediaId
				, width: dimensions.Width, height: dimensions.Height
				, title: `修改版本 #${index}`
			});
	};

	_['public'].Download=function (image) {
		if (!image) return Promise.resolve();
		return Flow.download({
			base64: image.base64
			, mimeType: image.mimeType||'image/png'
			, filename: `revised_concept_${Date.now()}.${image.mimeType.includes('jpeg')||image.mimeType.includes('jpg')?'jpg':'png'}`
		});
	};
	_['protected'].m_workspace=null;
	_['protected'].m_notify=null;
	_['protected'].m_generating=false;

});

