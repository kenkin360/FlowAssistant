var AgentApplication=Function.extend(Object, function () {
	var _=this(AgentApplication);
	AgentApplication=_[AgentApplication];
	function AgentApplication(sourceFiles, sourceUrl) {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_media=new MediaWorkspace();
		$this.m_conversation=new Conversation();
		$this.m_listeners=new Set();
		$this.m_assistant=new Assistant();
		$this.m_modules=new Modules(new Sources(sourceFiles, sourceUrl));
	}
	AgentApplication.ActionNames=['readCompiledSource', 'readRemoteSource', 'readInstalledSource', 'inspectRuntime', 'loadModule', 'rollback', 'resetConversation', 'generateVideo'];
	_['public'].SetReady=function (ready) { _(this).m_assistant.SetReady(ready); };
	_['public'].GetMedia=function () { return _(this).m_media; };
	_['public'].GetMessages=function () { return _(this).m_conversation.GetMessages(); };
	_['public'].IsConsulting=function () { return _(this).m_assistant.IsConsulting(); };
	_['public'].UpdateMedia=function (patch) {
		_(this).m_media.Apply(patch);
		this.Notify();
	};

	_['protected'].AddMessage=function (sender, text, fields={}) {
		let $this=_(this);
		$this.m_conversation.Add(sender, text, fields);
		$this.Notify();
	};

	_['protected'].ToLegacyMedia=async function (media) {
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

	_['public'].Reply=function (text, fields={}) {
		_(this).AddMessage('agent', text, fields);
	};

	_['public'].ReportError=function (error) {
		_(this).AddMessage('system', error.message||String(error));
	};

	_['public'].NotifyAssistant=async function (event, details, image) {
		try { await _(this).Report(event, details, image); }
		catch (error) { this.ReportError(error); }
	};

	_['public'].Subscribe=function (listener) {
		let $this=_(this);
		$this.m_listeners.add(listener);
		listener();
		return ()=>$this.m_listeners.delete(listener);
	};

	_['public'].Notify=function () {
		for (let listener of _(this).m_listeners) {
			try { listener(); }
			catch (error) { console.error('App subscriber failed:', error); }
		}
	};

	_['public'].ResetConversation=function () {
		let $this=_(this);
		if ($this.m_media.IsGenerating) throw new Error('Wait for image generation to finish before resetting the conversation.');
		$this.m_conversation.Clear();
		$this.UpdateMedia({generationPrompt: ''});
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
	_['public'].SendMessage=function (text) { return this.Send(text); };
	_['public'].Stop=function () {
		let $this=_(this);
		if (!$this.m_assistant.IsConsulting()) return;
		$this.m_assistant.Stop();
		$this.Notify();
	};
	_['public'].PickMedia=function () { return this.SelectMedia(); };
	_['public'].RunAction=async function (action, track=true, source, Type) {
		let $this=_(this);
		await $this.m_modules.GetStartup();
		let state=$this.m_media;
		let image=state.GetActiveMedia() instanceof Media.Image?await $this.ToLegacyMedia(state.GetActiveMedia()):null;
		let artifact=state.GetCurrentMedia()===state.GetActiveMedia()&&image?image:await $this.ToLegacyMedia(state.GetCurrentMedia());
		let result=await $this.ExecuteAction(action, {image, artifact, track, source, Type});
		if (result.artifact) {
			let media=state.ToMedia(result.artifact);
			if (media instanceof Media.Image||media instanceof Media.Video) {
				$this.UpdateMedia({activeMedia: media, currentMedia: media, history: [media, ...state.History]});
			}
			else $this.UpdateMedia({currentMedia: media});
			result.artifact=media;
		}
		return result;
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

	_['public'].InspectRuntime=function (args={}) {
		let runtime=this.GetRuntime();
		if ('string'===typeof args.name) {
			let fn=runtime.Modules[args.name]?.Run;
			if ('function'!==typeof fn) throw new Error('Runtime function not found: '+args.name);
			return {message: `${args.name}: ${fn.Description||String(fn)}`};
		}
		let modules=_(this).m_modules;
		return {message: `Callable modules: ${this.GetNames().map((name)=>name+(runtime.Modules[name].Run.Description?': '+runtime.Modules[name].Run.Description:'')).join('; ')||'(none)'}. Loaded modules: ${Object.keys(runtime.Modules).join(', ')||'(none)'}. Compiled source files: ${JSON.stringify(modules.GetSources().CompiledNames())}. Reversible installations: ${modules.GetVersionCount()}. Built-in actions: ${AgentApplication.ActionNames.join(', ')}.`};
	};

	_['public'].GetRuntime=function () { return _(this).m_modules.GetRuntime(); };
	_['public'].GetNames=function () { return _(this).m_modules.GetNames(); };
	_['public'].HasVersion=function () { return _(this).m_modules.HasVersion(); };
	_['public'].Rollback=function () { return _(this).m_modules.Rollback(); };
	_['public'].Initialize=function () { return _(this).m_modules.Initialize(); };
	_['public'].ReadCompiledSource=function (args={}) { return _(this).m_modules.GetSources().ReadCompiledSource(args); };
	_['public'].ReadRemoteSource=function (args={}) { return _(this).m_modules.GetSources().ReadRemoteSource(args); };
	_['public'].ReadInstalledSource=function (args={}) { return _(this).m_modules.GetSources().ReadInstalledSource(args); };
	_['public'].LoadModule=function (source, options={}) { return _(this).m_modules.LoadModule(source, options); };

	_['protected'].ResolveAction=function (name) {
		switch (name) {
			case 'readCompiledSource': return (args)=>this.ReadCompiledSource(args);
			case 'readRemoteSource': return (args)=>this.ReadRemoteSource(args);
			case 'readInstalledSource': return (args)=>this.ReadInstalledSource(args);
			case 'inspectRuntime': return (args)=>this.InspectRuntime(args);
			case 'loadModule': return (args, context)=>this.LoadModule(context.source, {name: args.name, Type: context.Type, readyMember: args.readyMember, track: context.track});
			case 'rollback': return ()=>({message: this.Rollback()});
			case 'resetConversation': return ()=>{ this.ResetConversation(); return {message: 'Conversation cleared.', conversationReset: true}; };
			case 'generateVideo': return (args, context)=>this.GenerateVideo(args, context);
			default: return this.GetRuntime().Modules[name]?.Run;
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

	_['public'].Send=async function (text) {
		let $this=_(this);
		let message=String(text??'').trim();
		if (!message||$this.IsConsulting()) return;
		let turn=$this.m_assistant.StartTurn();
		$this.AddMessage('user', message);
		try {
			await $this.HandleMessage(message, turn);
		}
		catch (error) { if (!turn.signal.aborted) await this.NotifyAssistant('Conversation failed', {Error: error.message||String(error)}); }
		finally {
			if ($this.m_assistant.CompleteTurn(turn)) {
				$this.Notify();
			}
		}
	};

	_['public'].SelectMedia=async function () {
		let $this=_(this);
		try {
			let image=await new ImageService().Select();
			if (!image) return;
			$this.UpdateMedia({activeMedia: image, currentMedia: image, history: [image, ...$this.m_media.History]});
			await this.NotifyAssistant('Media selected', {Title: image.title, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('App operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].CaptureCamera=async function () {
		let $this=_(this);
		try {
			let image=await new ImageService().Capture();
			if (!image) return;
			$this.UpdateMedia({activeMedia: image, currentMedia: image, history: [image, ...$this.m_media.History]});
			await this.NotifyAssistant('Camera image captured', {Title: image.title, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('App operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].Generate=async function (prompt) {
		let $this=_(this);
		let state=$this.m_media;
		let text=String(prompt||state.GetPrompt()).trim();
		if (!text||state.IsGenerating) return;
		$this.UpdateMedia({isGenerating: true});
		try {
			let generated=await new ImageService().Generate(text, state.GetActiveMedia() instanceof Media.Image?await $this.ToLegacyMedia(state.GetActiveMedia()):null, state.GetRatio(), state.History.length+1);
			let image=generated.Image;
			$this.UpdateMedia({activeMedia: image, currentMedia: image, history: [image, ...state.History]});
			await this.NotifyAssistant('Image generation completed', {Title: image.title, Prompt: text, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('App operation failed', {Error: error.message||String(error)}); }
		finally { $this.UpdateMedia({isGenerating: false}); }
	};

	_['public'].Download=async function () {
		let $this=_(this);
		try {
			let media=$this.m_media.GetActiveMedia();
			if (media instanceof Media.Video) await new VideoService().Download(await $this.ToLegacyMedia(media));
			else if (media instanceof Media.Image) await new ImageService().Download(await $this.ToLegacyMedia(media));
		}
		catch (error) { await this.NotifyAssistant('App operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].Welcome=async function (language) {
		let $this=_(this);
		$this.m_assistant.SetLanguage(language);
		let app=$this;
		let setupError='';
		let runtime={message: ''};

		try {
			await app.Initialize();
		}
		catch (error) {
			setupError=error.message||String(error);
		}

		try {
			runtime=await app.InspectRuntime({});
		}
		catch (error) {
			setupError=[setupError, error.message||String(error)].filter(Boolean).join('; ');
		}

		try {
			let response=await $this.m_assistant.RequestResponse('你是否了解自己的能力?', {systemInstruction: `
你正在此 App 中啟動。請依照下列實際檢查結果簡短歡迎使用者，描述目前可用的能力。以下提供原碼檔案清單與執行狀態；需要原碼內容時可使用對應讀取操作。請依瀏覽器語系或使用者對話語言回覆；尚無語言線索時使用英文。整個答覆必須是單一標準 JSON 物件，例如 {"reply":"歡迎訊息"}，不要使用 Markdown 程式碼區塊或額外文字。
${runtime.message}
啟動結果：${setupError||'success'}
瀏覽器語系：${language||'en'}
`});
			if (!app.GetMessages().length) {
				app.Reply(response.reply);
			}
		}
		catch (error) {
			app.ReportError(error);
		}
	};

	_['protected'].Instruction=function (runtime) {
		let $this=_(this);
		let dynamicList=$this.m_modules.DescribeDynamic();

		return `
你是此 App 的 Assistant。你可以討論需求，也可以請 App 執行本地操作。請依使用者本輪使用的語言自然答覆，參考對話或瀏覽器語系判斷語言，預設使用英文。
實際能力：${runtime.message}
本次對話中經由 loadModule 載入的模組：${dynamicList}

每次答覆都只輸出一個完整的標準 JSON 物件，不要使用 Markdown 程式碼區塊或附加文字。一般討論回覆 {"reply":"給使用者看的文字"}。需要操作時回覆 {"reply":"","attemptPlan":[{"action":"操作名稱","attempts":1,"reason":"目的與重試條件"}],"localAction":{"name":"操作名稱","arguments":{}}}；同一次僅執行一項操作，App 回傳結果後再依結果繼續、調整或答覆。使用 JSON 標準語法，字串內的換行與引號須正確跳脫。
readCompiledSource 空參數列出啟動時已完整拆解的固定 host 檔案，{file} 取得完整原碼；readRemoteSource 空參數列出 Bundle.Config 等遠端來源，{name} 可重新取得其內容；readInstalledSource 空參數列出已安裝模組，{name} 取得安裝時保留的完整原碼，遠端安裝者可重新取得。inspectRuntime 檢查現有函數、模組及原碼入口。
loadModule 的原碼或遠端腳本 URL 放在同一個 JSON 物件的 source 字串；sourceType 為 javascript 或 js（原碼），或 text 或 url（遠端腳本 URL）。localAction 為 {"name":"loadModule","arguments":{"name":"模組名稱"}}，並在 attemptPlan 列出 loadModule。自行撰寫類型時，以頂層 var 和 Function.extend(Base, factory) 宣告，將建構子、方法及靜態成員寫在類別定義內；需要完整範例時，可透過 readInstalledSource 查看 DrawRectangle 原碼。可呼叫的模組提供靜態 Run。
直接以模組名稱作為操作名稱呼叫其 Run；rollback 撤銷上一項模組安裝；resetConversation 清空對話。需要實作新功能時可讀程式碼並撰寫、載入模組。
generateVideo 可由使用者提出影片生成要求時執行，參數為 {prompt,aspectRatio,durationSeconds,resolution}；aspectRatio 為 16:9 或 9:16，durationSeconds 為 3 至 15，resolution 為 720p 或 360p。可選 useCurrentImageAsFirstFrame: true 作為首幀，或 useCurrentImageAsReference: true 作為參考；也可傳 firstFrameImageMediaId、referenceImageMediaIds，或 sourceVideoMediaId 作為影片編輯來源。首幀不得與參考圖或來源影片同時使用。完成後影片自動存入 Flow Assets，
可用模組可使用瀏覽器標準 API，Run 收到參數與 {artifact,image,track,source,Type}；有產物時回傳 {message,artifact:{mimeType,base64,...}} 或直接回傳具體的 Media.Image、Media.Video，種類以類型判斷；影片可保留 mediaId 與時長，檔案 MIME 類型必須明確。既有影像模組仍可回傳 {message,image:{base64,mimeType}}。模組可以只保留類型與靜態方法，若自行建立單例，應在 Function.extend 的類別定義內完成。
若有待使用者確認的影像生成提示詞，在同一個 JSON 物件中加入 suggestedPrompt、aspectRatio，即使沒有 localAction 也必須回傳。reply 是唯一會顯示給使用者的文字。操作結果與錯誤由 App 回傳；依使用者語言在 reply 說明結果。
`;
	};

	_['protected'].DescribeMedia=function (media) {
		if (!media) return null;
		return {
			type: media instanceof Media.Image?'image':media instanceof Media.Video?'video':'media'
			, id: media.Id
			, title: media.Title
			, mimeType: media.MimeType
			, mediaId: media.MediaId
			, ...(media instanceof Media.Image?{width: media.Width, height: media.Height}:{})
			, ...(media instanceof Media.Video?{durationSeconds: media.DurationSeconds, resolution: media.Resolution}:{})
		};
	};

	_['protected'].HandleMessage=function (message, turn) {
		return _(this).m_assistant.Process(message, turn, this);
	};

	_['public'].GetRequest=async function (message, reports, plan) {
		let $this=_(this);
		let prior=this.GetMessages().slice();
		if (prior.at(-1)?.Sender==='user'&&prior.at(-1)?.Text===message) prior.pop();
		let history=prior.slice(-20).map((entry)=>`${entry.Sender}: ${entry.Text}`).join('\n\n');
		let selected=$this.m_media.GetActiveMedia();
		let artifact=$this.m_media.GetCurrentMedia();
		let imageInfo=selected instanceof Media.Image?await this.GetImageInfo():null;
		let context=selected||artifact?`
Current image: ${imageInfo?`${imageInfo.width} × ${imageInfo.height} pixels (${imageInfo.mimeType})`:'none'}
Current artifact: ${JSON.stringify($this.DescribeMedia(artifact))}
Selected generation aspect ratio: ${$this.m_media.GetRatio()}`:'';
		let question=`
${context}
Previous conversation (up to 20 messages):
${history}
Current user message:
${message}
`;
		let prompt=reports.length?`
${question}
Current action plan: ${JSON.stringify(plan)}
Actual action results:
${reports.map(JSON.stringify).join('\n')}
Choose the next action, revise the plan, or answer the user based on the actual results.
`:question;
		let runtime=await this.InspectRuntime({});
		let options={systemInstruction: $this.Instruction(runtime)};
		if (selected instanceof Media.Image) {
			let image=await $this.ToLegacyMedia(selected);
			options.images=[{base64: image.base64, mimeType: image.mimeType}];
		}
		return {Prompt: `${prompt}. `, Options: options};
	};

	_['public'].GetSummaryRequest=async function (message, reports) {
		let request=await this.GetRequest(message, reports, []);
		return {Prompt: `${request.Prompt}\nSummarize these results and answer the user in natural language.`, Options: {systemInstruction: `
依使用者的語言，以 App 回報的結果為依據回答。整個答覆只輸出單一標準 JSON 物件 {"reply":"給使用者看的文字"}，不要附加文字或 Markdown。
`}};
	};

	_['public'].RunRequestedAction=async function (action, response, turn) {
		let result=await this.RunAction(action, true, response.source, response.Type);
		if (result.conversationReset) {
			let fresh=await _(this).m_assistant.RequestResponse('.', {systemInstruction: `
App 已清空對話。以使用者這次要求的語言回覆。整個答覆只輸出單一標準 JSON 物件 {"reply":"給使用者看的文字"}，不要附加文字或 Markdown。
`});
			if (turn?.signal.aborted) return result;
			this.Reply(fresh.reply);
			return result;
		}
		if ('loadModule'===action.name) {
			_(this).m_modules.RecordDynamic(action.arguments?.name||'CustomModule');
		}
		return result;
	};

	_['public'].DescribeResult=function (result) {
		return result.artifact?_(this).DescribeMedia(result.artifact):null;
	};

	_['public'].CompleteResponse=function (answer, responses, artifact) {
		let prompt=_(this).m_media.GetPrompt();
		let ratio=_(this).m_media.GetRatio();
		let changed=false;
		for (let response of responses) {
			if ('string'===typeof response.suggestedPrompt) { prompt=response.suggestedPrompt; changed=true; }
			if (['original', '1:1', '16:9', '9:16', '4:3', '3:4'].includes(response.aspectRatio)) { ratio=response.aspectRatio; changed=true; }
		}
		if (changed) this.UpdateMedia({generationPrompt: prompt, selectedRatio: ratio});
		let current=artifact||_(this).m_media.GetCurrentMedia();
		let attachment=artifact instanceof Media.Image||artifact instanceof Media.Video?artifact:current instanceof Media.Video?current:null;
		this.Reply(answer, {attachment});
	};

	_['protected'].Report=async function (event, details={}, image) {
		await _(this).m_assistant.WaitReady();

		let messages=this.GetMessages().slice(-8)
			.map((entry)=>`${entry.Sender}: ${entry.Text}`)
			.join('\n');

		let prompt=`
Recent conversation:
${messages}
App event: ${event}
Actual result: ${JSON.stringify(details)}
Reply briefly to the user in the language of the current conversation.
`;
		let response=await _(this).m_assistant.RequestResponse(`${prompt}. `, {systemInstruction: `
根據 App 回報的結果，依使用者當前對話語言簡短回覆。整個答覆只輸出單一標準 JSON 物件 {"reply":"給使用者看的文字"}，不要附加文字或 Markdown。
`});

		this.Reply(response.reply, image?{attachment: _(this).m_media.ToMedia(image)}:{});
	};

	_['protected'].m_media=null;
	_['protected'].m_conversation=null;
	_['protected'].m_listeners=null;
	_['protected'].m_assistant=null;
	_['protected'].m_modules=null;
});
