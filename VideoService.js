var VideoService=Function.extend(Object, function () {
	var _=this(VideoService);
	VideoService=_[VideoService];

	function VideoService() {
		_['base'].apply(this, arguments);
	}
	VideoService.ModelDisplayName='Omni 1.2 Flash';
	_['public'].GetInstruction=function () {
		return '產生影片時使用 MethodName: VideoService.Generate，Arguments 為 {prompt,aspectRatio,durationSeconds,resolution}。可選 useCurrentImageAsFirstFrame: true 作為首幀，或 useCurrentImageAsReference: true 作為參考；也可傳 firstFrameImageMediaId、referenceImageMediaIds，或 sourceVideoMediaId 作為影片編輯來源。首幀模式範例：{"prompt":"...","useCurrentImageAsFirstFrame":true}。完成後影片自動存入 Flow Assets。';
	};
	_['public'].DownloadCurrent=async function (workspace) {
		let selected=workspace.GetActiveMedia();
		if (selected instanceof Media.Video) await this.Download(await workspace.GetLegacyMedia(selected));
	};

	_['protected'].ResolveImageId=async function (image) {
		if ('string'===typeof image&&image) return image;
		if ('string'===typeof image?.mediaId&&image.mediaId) return image.mediaId;
		if ('string'!==typeof image?.base64||!image.base64||!/^image\//.test(image.mimeType)) {
			throw new Error('A reference image needs a mediaId or image base64 and MIME type.');
		}
		let upload=await Flow.upload({base64: image.base64, mimeType: image.mimeType, name: image.title||'Video reference image'});
		if (!upload?.mediaId) throw new Error('Flow did not return an image mediaId.');
		return upload.mediaId;
	};

	_['public'].Generate=async function (options={}, context={}) {
		let {prompt, firstFrameImage, referenceImages, sourceVideoMediaId, aspectRatio='16:9', durationSeconds=5, resolution='720p'}=options;
		if ((options.useCurrentImageAsFirstFrame||options.useCurrentImageAsReference)&&!context.image) throw new Error('No current image is available.');
		if (options.useCurrentImageAsFirstFrame&&options.firstFrameImageMediaId) throw new Error('Choose one first-frame image.');
		if (options.useCurrentImageAsFirstFrame) firstFrameImage=context.image;
		else if (options.firstFrameImageMediaId) firstFrameImage=options.firstFrameImageMediaId;
		if (options.useCurrentImageAsReference) referenceImages=[context.image, ...(options.referenceImageMediaIds||[])];
		else if (options.referenceImageMediaIds) referenceImages=options.referenceImageMediaIds;
		if ('string'!==typeof prompt||!prompt.trim()) throw new Error('Provide a video prompt.');
		if (firstFrameImage&&referenceImages?.length) throw new Error('A first frame and reference images cannot be used together.');
		if (firstFrameImage&&sourceVideoMediaId) throw new Error('A first frame and source video cannot be used together.');
		if (undefined!==sourceVideoMediaId&&('string'!==typeof sourceVideoMediaId||!sourceVideoMediaId)) throw new Error('The source video needs a mediaId.');
		if (undefined!==referenceImages&&!Array.isArray(referenceImages)) throw new Error('Reference images must be an array.');

		let firstFrameImageMediaId=firstFrameImage?await _(this).ResolveImageId(firstFrameImage):undefined;
		let referenceImageMediaIds=referenceImages?.length?await Promise.all(referenceImages.map((image)=>_(this).ResolveImageId(image))):undefined;
		let result=await Flow.generate.video({
			prompt: prompt.trim()
			, modelDisplayName: VideoService.ModelDisplayName
			, aspectRatio
			, durationSeconds
			, resolution
			, ...(firstFrameImageMediaId?{firstFrameImageMediaId}:{})
			, ...(referenceImageMediaIds?{referenceImageMediaIds}:{})
			, ...(sourceVideoMediaId?{sourceVideoMediaId}:{})
		});
		if ('string'!==typeof result?.mediaId||!result.mediaId) throw new Error('Flow did not return a saved video mediaId.');
		let content='string'===typeof result.base64?result:await Flow.media.getBase64({mediaId: result.mediaId});
		if ('string'!==typeof content?.base64||!content.base64) throw new Error('Flow did not return the generated video content.');
		let artifact={
			id: `video_${Date.now()}_${Math.random().toString(36).slice(2)}`
			, mediaId: result.mediaId
			, mimeType: content.mimeType||result.mimeType
			, base64: content.base64
			, prompt: prompt.trim()
			, title: result.name||'Generated video'
			, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
			, aspectRatio
			, durationSeconds
			, resolution
			, modelDisplayName: VideoService.ModelDisplayName
		};
		return {message: `Video generated and saved to Flow Assets (${artifact.mediaId}).`, artifact};
	};

	_['public'].Download=function (video) {
		if (!video) return Promise.resolve();
		let extension=video.mimeType?.includes('webm')?'webm':video.mimeType?.includes('quicktime')?'mov':'mp4';
		return Flow.download({base64: video.base64, mimeType: video.mimeType||'video/mp4', filename: `generated_video_${Date.now()}.${extension}`});
	};

});
