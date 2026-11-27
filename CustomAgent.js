var CustomAgent=Function.extend(React.Component, function () {
	var _=this(CustomAgent);
	CustomAgent=_[CustomAgent];

	function CustomAgent(props) {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_view=new View();
		$this.m_state=new AgentState();
		$this.m_listeners=new Set();
		$this.m_activeTurn=null;
		$this.m_ready=null;
		$this.m_modules=new Modules(new Sources(props.SourceFiles, props.HostSourceUrl));
		let template=document.createElement('template');
		template.innerHTML=agentTemplate;
		let app=template.content.querySelector('.ca-app');
		let media=app.querySelector('.ca-left');
		let chat=app.querySelector('.ca-right');
		$this.m_templates={Media: {__html: media.outerHTML}, Chat: {__html: chat.outerHTML}};
		media.remove();
		chat.remove();
		app.querySelector('.ca-work').remove();
		$this.m_templates.Shell={__html: template.content.querySelector('style').outerHTML+app.innerHTML};
		$this.m_modals={};
		$this.m_rootRef=(element)=>$this.m_view.SetRoot(element);
		this.state={Focused: 'Chat'};
	}

	_['protected'].Node=function (role) {
		return this.m_view.Node(role);
	};

	_['protected'].SetValues=function (patch) {
		this.m_state.Apply(patch);
		this.Update();
		this.Notify();
	};

	_['protected'].AddMessage=function (sender, text, fields={}) {
		let $this=_(this);
		$this.SetValues({messages: [...$this.m_state.Messages, {
			id: `${sender}_${Date.now()}_${Math.random()}`
			, sender
			, text
			, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
			, ...fields
		}]});
	};

	_['public'].Slots=['header', 'canvas', 'chat', 'overlay'];
	CustomAgent.ActionNames=['readCompiledSource', 'readRemoteSource', 'readInstalledSource', 'inspectRuntime', 'loadModule', 'rollback', 'resetConversation', 'generateVideo'];
	_['public'].Text=function (key) {
		let english={tagline: 'Describe an edit to use local tools, or generate an image', help: 'Help', target: 'Target Media', conversation: 'Conversation', download: 'Download', empty: 'No media selected. Load an image or describe an idea in chat.', media: '＋ Media', camera: 'Camera', generating: 'Generating image…', history: 'Media versions', copyPrompt: 'Copy prompt', generate: 'Generate image from confirmed changes', ratio: 'Output ratio', original: 'Original', input: 'Discuss an idea, draw a rectangle, inspect code, or create a local tool…', send: 'Send', stop: 'Stop', about: "Discuss image changes or ask for local operations. Only the Generate button creates a new image. You can also inspect and extend this session's code.", close: 'Close', confirmedChanges: 'Confirmed changes', you: 'You', agent: 'Assistant', promptDraft: 'Combined prompt draft: ', copy: 'Copy', thinking: 'Thinking and running local operations…'};
		let chinese={tagline: '描述修改即可執行本地操作，也可選擇生成影像', help: '使用說明', target: '目前媒體 (Target Media)', conversation: '對話', download: '下載', empty: '尚未選擇媒體。請載入圖片，或在對話中描述構想。', media: '＋ 媒體庫', camera: '拍照', generating: 'AI 正在修訂影像…', history: '媒體版本', copyPrompt: '複製提示詞', generate: '依已確認改動生成影像', ratio: '輸出比例', original: '原圖', input: '討論構想、畫矩形、查看程式碼，或編寫本地功能…', send: '傳送', stop: '停止', about: '可討論影像修改或要求本地操作。只有按下生成按鈕才會產生新影像，也可以要求查閱及擴充本次執行的程式碼。', close: '關閉', confirmedChanges: '已確認的改動項目', you: '您', agent: 'AI 助理 (Agent)', promptDraft: '整合提示詞草稿：', copy: '複製', thinking: '正在理解要求並處理本地操作…'};
		return ('zh'===_(this).m_view.GetLocale()?chinese:english)[key]||english[key]||key;
	};
	_['public'].Localize=function () { _(this).m_view.Localize((key)=>this.Text(key)); };

	_['public'].GetState=function () {
		return _(this).m_state.ToSnapshot();
	};

	_['protected'].ToLegacyMedia=async function (media) {
		if (!media) return null;
		let state=this.m_state;
		return {...media.toJSON(), base64: media.Data?await media.ToBase64():undefined, mediaId: state.MediaIds.get(media.Id), title: state.Labels.get(media.Id)};
	};

	_['public'].GetImageInfo=async function () {
		let $this=_(this);
		let image=$this.m_state.ActiveMedia;
		if (!(image instanceof Media.Image)) return null;
		let dimensions=image.Width&&image.Height?{width: image.Width, height: image.Height}:await new ImageService().GetDimensions(await $this.ToLegacyMedia(image));
		return {...dimensions, mimeType: image.MimeType, title: $this.m_state.Labels.get(image.Id)};
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

	_['public'].Mount=function (name, element, slot='header') { _(this).m_view.Mount(name, element, slot, this.Slots); };
	_['public'].Unmount=function (name) { _(this).m_view.Unmount(name); };
	_['public'].Mounted=function () { return _(this).m_view.Mounted(); };

	_['public'].Subscribe=function (listener) {
		let $this=_(this);
		$this.m_listeners.add(listener);
		listener(this.GetState());
		return ()=>$this.m_listeners.delete(listener);
	};

	_['public'].Notify=function () {
		for (let listener of _(this).m_listeners) {
			try { listener(this.GetState()); }
			catch (error) { console.error('App subscriber failed:', error); }
		}
	};

	_['public'].UpdateConversation=function (patch) { _(this).SetValues(patch); };
	_['public'].ResetConversation=function () {
		let $this=_(this);
		if ($this.m_state.IsGenerating) throw new Error('Wait for image generation to finish before resetting the conversation.');
		$this.SetValues({messages: [], accumulatedChanges: [], generationPrompt: '', inputText: ''});
	};
	_['public'].SetInput=function (value) { this.UpdateConversation({inputText: value}); };
	_['public'].SetRatio=function (value) {
		if (!['original', '1:1', '16:9', '9:16', '4:3', '3:4'].includes(value)) throw new Error('Unsupported aspect ratio.');
		this.UpdateConversation({selectedRatio: value});
	};
	_['public'].SelectVersion=function (id) {
		let $this=_(this);
		let media=$this.m_state.History.find((item)=>item.Id===id);
		if (!media) throw new Error('Media version not found: '+id);
		$this.SetValues({activeMedia: media, currentMedia: media});
	};
	_['public'].SendMessage=function (text) { return this.Send(text); };
	_['public'].Stop=function () {
		let $this=_(this);
		if (!$this.m_activeTurn) return;
		$this.m_activeTurn.abort();
		$this.m_activeTurn=null;
		$this.SetValues({isConsulting: false});
	};
	_['public'].PickMedia=function () { return this.SelectMedia(); };
	_['public'].RunAction=async function (action, track=true, source, Type) {
		let $this=_(this);
		await $this.m_modules.GetStartup();
		let state=$this.m_state;
		let image=state.ActiveMedia instanceof Media.Image?await $this.ToLegacyMedia(state.ActiveMedia):null;
		let artifact=state.CurrentMedia===state.ActiveMedia&&image?image:await $this.ToLegacyMedia(state.CurrentMedia);
		let result=await $this.ExecuteAction(action, {image, artifact, track, source, Type});
		if (result.artifact) {
			let media=state.AsMedia(result.artifact);
			if (media instanceof Media.Image||media instanceof Media.Video) {
				$this.SetValues({activeMedia: result.artifact, currentMedia: result.artifact, history: [result.artifact, ...state.History]});
			}
			else $this.SetValues({currentMedia: result.artifact});
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
		return {message: `Callable modules: ${this.GetNames().map((name)=>name+(runtime.Modules[name].Run.Description?': '+runtime.Modules[name].Run.Description:'')).join('; ')||'(none)'}. Loaded modules: ${Object.keys(runtime.Modules).join(', ')||'(none)'}. Compiled source files: ${JSON.stringify(modules.GetSources().CompiledNames())}. Bundle.Config: ${JSON.stringify(Bundle.Config)}. UI slots: ${this.Slots.join(', ')||'(unavailable)'}. Mounted UI: ${this.Mounted().join(', ')||'(none)'}. Reversible installations: ${modules.GetVersionCount()}. Built-in actions: ${CustomAgent.ActionNames.join(', ')}.`};
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
		let image=await new ImageService().ReadActionResult(value, context.image, action.name);
		if (image) return {message: 'string'===typeof value.message?value.message:`${action.name} updated the current image.`, artifact: image, image};
		if (value&&'string'===typeof value.message) return value;
		return {message: `${action.name}: ${('string'===typeof value?value:JSON.stringify(value)??'completed').slice(0,12000)}`};
	};

	_['public'].componentDidMount=function () {
		let $this=_(this);
		$this.GetRuntime().UI=this;
		let root=$this.m_view.GetRoot();
		root.onclick=(event)=>{
			let target=event.target.closest?.('[data-action],[data-ratio]');
			if (!target||!root.contains(target)) return;
			if (target.dataset.ratio) { $this.SetRatio(target.dataset.ratio); return; }
			switch (target.dataset.action) {
				case 'media-window': new HtmlNode($this.Node('media-window')).SetStyle('display', ''); this.setState({Focused: 'Media'}); break;
				case 'chat-window': new HtmlNode($this.Node('chat-window')).SetStyle('display', ''); this.setState({Focused: 'Chat'}); break;
				case 'send': $this.m_state.IsConsulting?$this.Stop():$this.Send(); break;
				case 'select': $this.SelectMedia(); break;
				case 'camera': $this.CaptureCamera(); break;
				case 'download': $this.Download(); break;
				case 'generate': $this.Generate(); break;
				case 'info': new HtmlNode($this.Node('dialog')).SetStyle('display', 'flex'); break;
				case 'close-info': new HtmlNode($this.Node('dialog')).SetStyle('display', 'none'); break;
				case 'copy-prompt': navigator.clipboard.writeText($this.m_state.GenerationPrompt||''); break;
			}
		};
		root.oninput=(event)=>{
			if (event.target===$this.Node('input')) $this.m_state.InputText=event.target.value;
		};
		root.onkeydown=(event)=>{
			if (event.target===$this.Node('input')&&'Enter'===event.key&&!event.shiftKey&&!event.isComposing) {
				event.preventDefault();
				if (!$this.m_state.IsConsulting) $this.Send();
			}
		};
		$this.Update();
		$this.ArrangeModals();
		$this.m_ready=$this.Welcome();
	};

	_['protected'].Update=function () {
		this.m_view.Update(this.m_state, (key)=>this.Text(key), (id)=>this.SelectVersion(id));
	};

	_['public'].Send=async function (text) {
		let $this=_(this);
		let message=String(text??$this.m_state.InputText).trim();
		if (!message||$this.m_state.IsConsulting) return;
		let turn=new AbortController();
		$this.m_activeTurn=turn;
		$this.AddMessage('user', message);
		$this.SetValues({inputText: '', isConsulting: true});
		try {
			await $this.HandleMessage(message, turn);
		}
		catch (error) { if (!turn.signal.aborted) await this.NotifyAssistant('Conversation failed', {Error: error.message||String(error)}); }
		finally {
			if ($this.m_activeTurn===turn) {
				$this.m_activeTurn=null;
				$this.SetValues({isConsulting: false});
			}
		}
	};

	_['public'].SelectMedia=async function () {
		let $this=_(this);
		try {
			let image=await new ImageService().Select();
			if (!image) return;
			$this.SetValues({activeMedia: image, currentMedia: image, history: [image, ...$this.m_state.History]});
			await this.NotifyAssistant('Media selected', {Title: image.title, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('App operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].CaptureCamera=async function () {
		let $this=_(this);
		try {
			let image=await new ImageService().Capture();
			if (!image) return;
			$this.SetValues({activeMedia: image, currentMedia: image, history: [image, ...$this.m_state.History]});
			await this.NotifyAssistant('Camera image captured', {Title: image.title, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('App operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].Generate=async function (prompt) {
		let $this=_(this);
		let state=$this.m_state;
		let text=String(prompt||state.GenerationPrompt).trim();
		if (!text||state.IsGenerating) return;
		$this.SetValues({isGenerating: true});
		try {
			let generated=await new ImageService().Generate(text, state.ActiveMedia instanceof Media.Image?await $this.ToLegacyMedia(state.ActiveMedia):null, state.SelectedRatio, state.History.length+1);
			let image=generated.Image;
			$this.SetValues({activeMedia: image, currentMedia: image, history: [image, ...state.History]});
			await this.NotifyAssistant('Image generation completed', {Title: image.title, Prompt: text, Width: image.width, Height: image.height}, image);
		}
		catch (error) { await this.NotifyAssistant('App operation failed', {Error: error.message||String(error)}); }
		finally { $this.SetValues({isGenerating: false}); }
	};

	_['public'].Download=async function () {
		let $this=_(this);
		try {
			let media=$this.m_state.ActiveMedia;
			if (media instanceof Media.Video) await new VideoService().Download(await $this.ToLegacyMedia(media));
			else if (media instanceof Media.Image) await new ImageService().Download(await $this.ToLegacyMedia(media));
		}
		catch (error) { await this.NotifyAssistant('App operation failed', {Error: error.message||String(error)}); }
	};

	_['public'].componentWillUnmount=function () {
		let $this=_(this);
		this.Stop();
		let root=$this.m_view.GetRoot();
		if (root) root.onclick=root.oninput=root.onkeydown=null;
		let runtime=this.GetRuntime();
		if (runtime.UI===this) delete runtime.UI;
		for (let name of this.Mounted()) this.Unmount(name);
		$this.m_view.Dispose();
		$this.m_listeners.clear();
	};

	_['protected'].ArrangeModals=function (name) {
		let root=_(this).m_view.GetRoot();
		if (!root) return;
		let rect=root.getBoundingClientRect();
		let header=root.querySelector('header')?.offsetHeight||52;
		let right=Math.max(340, Math.round(rect.width*0.42));
		let left=Math.max(320, Math.round(rect.width-right));
		let height=Math.max(272, Math.round(rect.height-header));
		let layouts={
			Media: {position: {x: rect.left, y: rect.top+header}, size: {width: left, height}}
			, Chat: {position: {x: rect.right-right, y: rect.top+header}, size: {width: right, height}}
		};
		if (rect.width<=760) {
			let mediaHeight=Math.max(272, Math.round(height*0.42));
			layouts.Media.size={width: Math.max(340, rect.width), height: mediaHeight};
			layouts.Chat.position={x: rect.left, y: rect.top+header+mediaHeight};
			layouts.Chat.size={width: Math.max(340, rect.width), height: Math.max(272, height-mediaHeight)};
		}
		for (let key of name?[name]:['Media', 'Chat']) _(this).m_modals[key]?.setState(layouts[key]);
	};

	_['public'].render=function () {
		let $this=_(this);
		return React.createElement('div', {ref: $this.m_rootRef, className: 'ca-app', 'data-role': 'app', style: {height: '100%', width: '100%'}},
			React.createElement('div', {dangerouslySetInnerHTML: $this.m_templates.Shell}),
			...[['Media', 'target', 320], ['Chat', 'conversation', 340]].map(([name, title, minimum])=>React.createElement('div', {
				key: name, className: 'ca-window', 'data-role': name==='Media'?'media-window':'chat-window'
			}, React.createElement(Modal, {
				title: this.Text(title)
				, ref: (modal)=>{ $this.m_modals[name]=modal; }
				, defaultSize: {width: Math.round(window.innerWidth*(name==='Media'?0.58:0.42)), height: window.innerHeight-52}
				, getContentMinimumSize: ()=>({width: minimum, height: 240})
				, allowContentWheel: true
				, zIndex: this.state.Focused===name?52:51
				, onFocus: ()=>this.setState({Focused: name})
				, onResetPosition: ()=>$this.ArrangeModals(name)
				, onClose: ()=>new HtmlNode($this.Node(name==='Media'?'media-window':'chat-window')).SetStyle('display', 'none')
			}, React.createElement('div', {className: 'ca-modal-content', dangerouslySetInnerHTML: $this.m_templates[name]})))));
	};

	_['protected'].Welcome=async function () {
		let $this=_(this);
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
			let response=await $this.RequestResponse('你是否了解自己的能力?', {systemInstruction: `
你正在此 App 中啟動。請依照下列實際檢查結果簡短歡迎使用者，描述目前可用的能力。以下提供原碼檔案清單與執行狀態；需要原碼內容時可使用對應讀取操作。請依瀏覽器語系或使用者對話語言回覆；尚無語言線索時使用英文。整個答覆必須是單一標準 JSON 物件，例如 {"reply":"歡迎訊息"}，不要使用 Markdown 程式碼區塊或額外文字。
${runtime.message}
啟動結果：${setupError||'success'}
瀏覽器語系：${navigator.language}
`});
			if (!app.GetState().messages.length) {
				app.Reply(response.reply);
			}
		}
		catch (error) {
			app.ReportError(error);
		}
	};

	_['protected'].ReadResponse=function (value, allowAction=true) {
		let raw=String(value??'');
		let fallback=()=>{
			let label='zh'===this.m_view.GetLocale()?'回應格式不正確，未執行任何動作。原始回應：\n':'Invalid response format; no action was performed. Original response:\n';
			return {reply: label+raw, accumulatedChanges: null, suggestedPrompt: null, aspectRatio: null, attemptPlan: [], localAction: null, source: null, Type: null, Valid: false};
		};
		let match=raw.match(/^\s*(\{[\s\S]*\})\s*$/);
		if (!match) {
			match=raw.match(/^\s*```json\s*\n\s*(\{[\s\S]*\})\s*\n```\s*$/i);
		}
		if (!match) {
			return fallback();
		}

		let valueObject=null;
		try {
			valueObject=JSON.parse(match[1]);
		}
		catch (error) {
			return fallback();
		}
		if (!valueObject||'object'!==typeof valueObject||Array.isArray(valueObject)) {
			return fallback();
		}

		let data=Object.assign({
			reply: ''
			, accumulatedChanges: null
			, suggestedPrompt: null
			, aspectRatio: null
			, attemptPlan: []
			, localAction: null
			, source: null
			, sourceType: null
		}, valueObject);
		if ('string'!==typeof data.reply
			||null!==data.accumulatedChanges&&(!Array.isArray(data.accumulatedChanges)||!data.accumulatedChanges.every((item)=>'string'===typeof item))
			||null!==data.suggestedPrompt&&'string'!==typeof data.suggestedPrompt
			||null!==data.aspectRatio&&!['original', '1:1', '16:9', '9:16', '4:3', '3:4'].includes(data.aspectRatio)
			||!Array.isArray(data.attemptPlan)||!data.attemptPlan.every((item)=>item&&'object'===typeof item&&!Array.isArray(item)&&'string'===typeof item.action)
			||null!==data.localAction&&(false===allowAction||'object'!==typeof data.localAction||Array.isArray(data.localAction)||'string'!==typeof data.localAction.name||!data.localAction.name||!data.localAction.arguments||'object'!==typeof data.localAction.arguments||Array.isArray(data.localAction.arguments))
			||null!==data.source&&'string'!==typeof data.source
			||null!==data.sourceType&&'string'!==typeof data.sourceType
			||!data.reply.trim()&&!data.localAction) {
			return fallback();
		}

		let Type=null;
		if (data.localAction&&!data.attemptPlan.some((item)=>item.action===data.localAction.name)) {
			return fallback();
		}
		if ('loadModule'===data.localAction?.name) {
			if (!data.source||!['javascript', 'js', 'text', 'url'].includes(data.sourceType)) {
				return fallback();
			}
			Type='javascript'===data.sourceType||'js'===data.sourceType?Resource.Inline:Resource.Module;
		}
		else if (null!==data.source||null!==data.sourceType) {
			return fallback();
		}
		return {...data, Type, Valid: true};
	};

	_['protected'].RequestResponse=async function (prompt, options, allowAction=false) {
		let response=await Flow.generate.text(prompt, options);
		return this.ReadResponse(response?.text, allowAction);
	};

	_['protected'].Instruction=function (runtime) {
		let $this=_(this);
		let dynamicList=$this.m_modules.DescribeDynamic();

		return `
你是此 App 的 Assistant。你可以討論需求，也可以請 App 執行本地操作；影像生成由使用者按下生成按鈕啟動。請依使用者本輪使用的語言自然答覆，參考對話或瀏覽器語系判斷語言，預設使用英文。
實際能力：${runtime.message}
本次對話中經由 loadModule 載入的模組：${dynamicList}

每次答覆都只輸出一個完整的標準 JSON 物件，不要使用 Markdown 程式碼區塊或附加文字。一般討論回覆 {"reply":"給使用者看的文字"}。需要操作時回覆 {"reply":"","attemptPlan":[{"action":"操作名稱","attempts":1,"reason":"目的與重試條件"}],"localAction":{"name":"操作名稱","arguments":{}}}；同一次僅執行一項操作，App 回傳結果後再依結果繼續、調整或答覆。使用 JSON 標準語法，字串內的換行與引號須正確跳脫。
readCompiledSource 空參數列出啟動時已完整拆解的固定 host 檔案，{file} 取得完整原碼；readRemoteSource 空參數列出 Bundle.Config 等遠端來源，{name} 可重新取得其內容；readInstalledSource 空參數列出已安裝模組，{name} 取得安裝時保留的完整原碼，遠端安裝者可重新取得。inspectRuntime 檢查現有函數、模組及原碼入口。
loadModule 的原碼或遠端腳本 URL 放在同一個 JSON 物件的 source 字串；sourceType 為 javascript 或 js（原碼），或 text 或 url（遠端腳本 URL）。localAction 為 {"name":"loadModule","arguments":{"name":"模組名稱"}}，並在 attemptPlan 列出 loadModule。自行撰寫類型時，以頂層 var 和 Function.extend(Base, factory) 宣告，將建構子、方法及靜態成員寫在類別定義內；需要完整範例時，可透過 readInstalledSource 查看 DrawRectangle 原碼。可呼叫的模組提供靜態 Run。
直接以模組名稱作為操作名稱呼叫其 Run；rollback 撤銷上一項模組安裝；resetConversation 清空對話。需要實作新功能時可讀程式碼並撰寫、載入模組。
generateVideo 可由使用者提出影片生成要求時執行，參數為 {prompt,aspectRatio,durationSeconds,resolution}；aspectRatio 為 16:9 或 9:16，durationSeconds 為 3 至 15，resolution 為 720p 或 360p。可選 useCurrentImageAsFirstFrame: true 作為首幀，或 useCurrentImageAsReference: true 作為參考；也可傳 firstFrameImageMediaId、referenceImageMediaIds，或 sourceVideoMediaId 作為影片編輯來源。首幀不得與參考圖或來源影片同時使用。完成後影片自動存入 Flow Assets，並顯示在媒體區。
可用模組可使用瀏覽器標準 API，Run 收到參數與 {artifact,image,track,source,Type}；有產物時回傳 {message,artifact:{mimeType,base64,...}} 或直接回傳具體的 Media.Image、Media.Video，種類以類型判斷；影片可保留 mediaId 與時長，檔案 MIME 類型必須明確。既有影像模組仍可回傳 {message,image:{base64,mimeType}}。UI 可透過 AppRuntime.UI.Mount 掛入介面。模組可以只保留類型與靜態方法，若自行建立單例，應在 Function.extend 的類別定義內完成。
若有待使用者確認的生成修改，在同一個 JSON 物件中加入 accumulatedChanges（字串陣列）、suggestedPrompt、aspectRatio，即使沒有 localAction 也必須回傳。reply 是唯一會顯示給使用者的文字。操作結果與錯誤由 App 回傳；依使用者語言在 reply 說明結果。
`;
	};

	_['protected'].DescribeMedia=function (media) {
		if (!media) return null;
		let state=this.m_state;
		return {
			type: media instanceof Media.Image?'image':media instanceof Media.Video?'video':'media'
			, id: media.Id
			, title: state.Labels.get(media.Id)
			, mimeType: media.MimeType
			, mediaId: state.MediaIds.get(media.Id)
			, ...(media instanceof Media.Image?{width: media.Width, height: media.Height}:{})
			, ...(media instanceof Media.Video?{durationSeconds: media.DurationSeconds, resolution: media.Resolution}:{})
		};
	};

	_['protected'].HandleMessage=async function (message, turn) {
		let $this=_(this);
		await $this.m_ready;
		if (turn?.signal.aborted) return;

		let app=$this;
		let initial=app.GetState();
		let imageInfo=await app.GetImageInfo();
		if (turn?.signal.aborted) return;

		let prior=initial.messages.slice();
		if (prior.at(-1)?.sender==='user'&&prior.at(-1)?.text===message) prior.pop();

		let history=prior.slice(-20).map((entry)=>`${entry.sender}: ${entry.text}`).join('\n\n');
		let changes=initial.accumulatedChanges.length
			?initial.accumulatedChanges.map((entry, index)=>`${index+1}. ${entry}`).join('\n')
			:'(none)';

		let artifact=$this.m_state.CurrentMedia;
		let question=()=>`
Current image: ${imageInfo?`${imageInfo.width} × ${imageInfo.height} pixels (${imageInfo.mimeType})`:'none'}
Current artifact: ${JSON.stringify($this.DescribeMedia(artifact))}
Selected generation aspect ratio: ${initial.selectedRatio}
Pending generation changes:
${changes}
Previous conversation (up to 20 messages):
${history}
Current user message:
${message}
`;

		let image=$this.m_state.ActiveMedia instanceof Media.Image?await $this.ToLegacyMedia($this.m_state.ActiveMedia):null;
		let changesOut=initial.accumulatedChanges;
		let promptOut=initial.generationPrompt;
		let ratioOut=initial.selectedRatio;
		let edited=null;
		let plan=[];
		let reports=[];
		let answer='';
		let structured=false;
		let runtime=await app.InspectRuntime({});

		for (;;) {
			if (turn?.signal.aborted) return;

			let request=reports.length?`
${question()}
Current action plan: ${JSON.stringify(plan)}
Actual action results:
${reports.map(JSON.stringify).join('\n')}
Choose the next action, revise the plan, or answer the user based on the actual results.
`:question();

			let options={systemInstruction: $this.Instruction(runtime)};
			if (image) options.images=[{base64: image.base64, mimeType: image.mimeType}];

			let data=await $this.RequestResponse(`${request}. `, options, true);
			if (turn?.signal.aborted) return;
			answer=data.reply;

			if (data.Valid) {
				structured=true;
				if (Array.isArray(data.accumulatedChanges)) {
					changesOut=data.accumulatedChanges.filter((item)=>'string'===typeof item);
				}
				if ('string'===typeof data.suggestedPrompt) promptOut=data.suggestedPrompt;
				if (['original', '1:1', '16:9', '9:16', '4:3', '3:4'].includes(data.aspectRatio)) {
					ratioOut=data.aspectRatio;
				}
				if (Array.isArray(data.attemptPlan)&&data.attemptPlan.length) plan=data.attemptPlan;
			}

			let action=data?.localAction;
			if (!action||'string'!==typeof action.name) break;

			if (!plan.some((entry)=>entry.action===action.name)) {
				reports.push({
					action: action.name
					, status: 'error'
					, result: 'The action needs an attemptPlan entry before execution.'
				});
				continue;
			}

			try {
				if (turn?.signal.aborted) return;

				let result=await app.RunAction(action, true, data.source, data.Type);
				if (turn?.signal.aborted) return;

				if (result.conversationReset) {
					let fresh=await $this.RequestResponse('.', {systemInstruction: `
App 已清空對話。以使用者這次要求的語言回覆。整個答覆只輸出單一標準 JSON 物件 {"reply":"給使用者看的文字"}，不要附加文字或 Markdown。
`});
					if (turn?.signal.aborted) return;
					app.Reply(fresh.reply);
					return;
				}

				if (result.artifact) {
					artifact=result.artifact;
					image=artifact instanceof Media.Image?await $this.ToLegacyMedia(artifact):null;
					imageInfo=artifact instanceof Media.Image?{width: artifact.Width, height: artifact.Height, mimeType: artifact.MimeType}:null;
					edited=artifact instanceof Media.Image||artifact instanceof Media.Video?artifact:null;
				}

				if ('loadModule'===action.name) {
					let modName=action.arguments?.name||'CustomModule';
					$this.m_modules.RecordDynamic(modName);
				}

				reports.push({
					action: action.name
					, status: 'success'
					, result: result.message
					, ...(result.artifact?{artifact: $this.DescribeMedia(result.artifact)}:{})
				});
				runtime=await app.InspectRuntime({});
			}
			catch (error) {
				reports.push({
					action: action.name
					, status: 'error'
					, result: error instanceof Error?error.message:String(error)
				});
			}
		}

		if (!answer) {
			let prompt=`
${question()}
Actual action results:
${reports.map(JSON.stringify).join('\n')}
Summarize these results and answer the user in natural language.
`;
			let response=await $this.RequestResponse(`${prompt}. `, {systemInstruction: `
依使用者的語言，以 App 回報的結果為依據回答。整個答覆只輸出單一標準 JSON 物件 {"reply":"給使用者看的文字"}，不要附加文字或 Markdown。
`});
			if (turn?.signal.aborted) return;
			answer=response.reply;
		}

		if (!answer) {
			answer=$this.ReadResponse('', false).reply;
		}
		if (turn?.signal.aborted) return;

		if (structured) {
			app.UpdateConversation({
				accumulatedChanges: changesOut
				, generationPrompt: changesOut.length?promptOut:''
				, selectedRatio: ratioOut
			});
		}

		app.Reply(answer, {
			accumulatedChanges: changesOut
			, suggestedPrompt: promptOut||undefined
			, aspectRatio: ratioOut
			, includedMedia: edited||(artifact instanceof Media.Video?artifact:undefined)
		});
	};

	_['protected'].Report=async function (event, details={}, image) {
		await _(this).m_ready;

		let messages=this.GetState().messages.slice(-8)
			.map((entry)=>`${entry.sender}: ${entry.text}`)
			.join('\n');

		let prompt=`
Recent conversation:
${messages}
App event: ${event}
Actual result: ${JSON.stringify(details)}
Reply briefly to the user in the language of the current conversation.
`;
		let response=await _(this).RequestResponse(`${prompt}. `, {systemInstruction: `
根據 App 回報的結果，依使用者當前對話語言簡短回覆。整個答覆只輸出單一標準 JSON 物件 {"reply":"給使用者看的文字"}，不要附加文字或 Markdown。
`});

		this.Reply(response.reply, image?{includedMedia: image}:{});
	};

	_['protected'].m_state=null;
	_['protected'].m_listeners=null;
	_['protected'].m_activeTurn=null;
	_['protected'].m_ready=null;
	_['protected'].m_view=null;
	_['protected'].m_modules=null;
	_['protected'].m_templates=null;
	_['protected'].m_modals=null;
	_['protected'].m_rootRef=null;
});
