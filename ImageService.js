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
	_['public'].IsGenerating=function () { return _(this).m_generating; };
	_['public'].GetInstruction=function () {
		return '若有待使用者確認的影像生成提示詞，回覆同一 JSON 物件的 suggestedPrompt、aspectRatio。';
	};
	_['public'].GetRequestContext=async function () {
		let workspace=this.GetWorkspace();
		let selected=workspace.GetActiveMedia();
		let artifact=workspace.GetCurrentMedia();
		let info=selected instanceof Media.Image?await this.GetDimensions(await workspace.GetLegacyMedia(selected)):null;
		let text=selected||artifact?'目前影像：'+(info?info.width+' × '+info.height+' ('+selected.MimeType+')':'無')+'；目前產物：'+JSON.stringify(workspace.Describe(artifact))+'；選定比例：'+workspace.GetRatio():'';
		let images=[];
		if (selected instanceof Media.Image) {
			let image=await workspace.GetLegacyMedia(selected);
			images=[{base64: image.base64, mimeType: image.mimeType}];
		}
		return {Text: text, Images: images};
	};
	_['public'].ApplySuggestions=function (responses) {
		let workspace=this.GetWorkspace();
		for (let response of responses) {
			if ('string'===typeof response.suggestedPrompt) workspace.SetPrompt(response.suggestedPrompt);
			if (['original', '1:1', '16:9', '9:16', '4:3', '3:4'].includes(response.aspectRatio)) workspace.SetRatio(response.aspectRatio);
		}
	};
	_['public'].SelectCurrent=async function () {
		try {
			let image=await this.Select();
			if (!image) return;
			this.GetWorkspace().Add(image);
			await _(this).m_notify('Media selected', {Title: image.title, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await _(this).m_notify('Operation failed', {Error: error.message||String(error)}); }
	};
	_['public'].CaptureCurrent=async function () {
		try {
			let image=await this.Capture();
			if (!image) return;
			this.GetWorkspace().Add(image);
			await _(this).m_notify('Camera image captured', {Title: image.title, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await _(this).m_notify('Operation failed', {Error: error.message||String(error)}); }
	};
	_['public'].GenerateCurrent=async function (prompt) {
		let $this=_(this);
		let workspace=this.GetWorkspace();
		let text=String(prompt||workspace.GetPrompt()).trim();
		if (!text||$this.m_generating) return;
		$this.m_generating=true;
		workspace.NotifyChanged();
		try {
			let selected=workspace.GetActiveMedia();
			let result=await this.Generate(text, selected instanceof Media.Image?await workspace.GetLegacyMedia(selected):null, workspace.GetRatio(), workspace.History.length+1);
			workspace.Add(result.Image);
			await $this.m_notify('Image generation completed', {Title: result.Image.title, Prompt: text, Width: result.Image.width, Height: result.Image.height}, result.Image);
		}
		catch (error) { await $this.m_notify('Operation failed', {Error: error.message||String(error)}); }
		finally { $this.m_generating=false; workspace.NotifyChanged(); }
	};
	_['public'].DownloadCurrent=async function () {
		try {
			let workspace=this.GetWorkspace();
			let selected=workspace.GetActiveMedia();
			if (selected instanceof Media.Image) await this.Download(await workspace.GetLegacyMedia(selected));
		}
		catch (error) { await _(this).m_notify('Operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].GetDimensions=async function (image) {
		if (Number.isInteger(image?.width)&&Number.isInteger(image?.height)&&image.width>0&&image.height>0) {
			return {width: image.width, height: image.height};
		}
		let source=new Image();
		source.src=`data:${image.mimeType};base64,${image.base64}`;
		await source.decode();
		if (!source.naturalWidth||!source.naturalHeight) throw new Error('Unable to read image dimensions.');
		return {width: source.naturalWidth, height: source.naturalHeight};
	};

	_['public'].GetAspectRatio=function ({width, height}) {
		let a=width;
		let b=height;
		while (b) [a, b]=[b, a%b];
		return width/a+':'+height/a;
	};

	_['public'].ReadMethodResult=async function (value, image, methodName) {
		let output=value&&'object'===typeof value&&'image' in value?value.image:value;
		if (!output||'string'!==typeof output.base64||!/^image\/(png|jpeg|webp)$/.test(output.mimeType)) return null;
		let dimensions=await this.GetDimensions(output);
		let original=image||{};
		return {
			...original, id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`
			, base64: output.base64, mimeType: output.mimeType, mediaId: undefined
			, ...dimensions
			, prompt: `本地方法修改：${methodName}`
			, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
			, aspectRatio: this.GetAspectRatio(dimensions)
			, title: output.title||`${original.title||'Image'} · ${methodName}`
		};
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
		let dimensions=await this.GetDimensions(selected);
		return {
			id: 'img_'+Date.now()
			, base64: selected.base64
			, mimeType: selected.mimeType
			, mediaId: selected.mediaId
			, prompt: '從媒體庫匯入的原始影像'
			, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
			, aspectRatio: this.GetAspectRatio(dimensions)
			, ...dimensions
			, title: selected.name||'匯入影像'
		};
	};

	_['public'].Capture=async function () {
		let flow=Flow;
		let photo=await flow.camera.capture({facingMode: 'user'});
		if (!photo) return null;
		let dimensions=await this.GetDimensions(photo);
		let upload=await flow.upload({
			base64: photo.base64
			, mimeType: 'image/png'
			, name: 'Camera Capture '+new Date().toLocaleTimeString()
		});
		return {
			id: 'cam_'+Date.now()
			, base64: photo.base64
			, mimeType: photo.mimeType||'image/png'
			, mediaId: upload.mediaId
			, prompt: '相機即時拍攝'
			, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
			, aspectRatio: this.GetAspectRatio(dimensions)
			, ...dimensions
			, title: '相機拍照'
		};
	};

	_['public'].Generate=async function (prompt, image, ratio, index) {
		let flow=Flow;
		let mediaId=image?.mediaId;
		let aspectRatio='original'===ratio?(image?this.GetAspectRatio(await this.GetDimensions(image)):undefined):ratio;
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
		let dimensions=await this.GetDimensions(result);
		return {
			SourceMediaId: mediaId
			, Image: {
				id: 'ver_'+Date.now()
				, base64: result.base64
				, mimeType: result.mimeType
				, mediaId: result.mediaId
				, prompt
				, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
				, aspectRatio: this.GetAspectRatio(dimensions)
				, ...dimensions
				, title: `修改版本 #${index}`
			}
		};
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

