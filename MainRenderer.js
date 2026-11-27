var MainRenderer=Function.extend(React.Component, function () {
	var _=this(MainRenderer);
	MainRenderer=_[MainRenderer];
	function MainRenderer(props) {
		let initialize=function () {
			let $this=_(this);
			$this.m_view=new View();
			$this.m_application=new AgentApplication(props.SourceFiles, props.HostSourceUrl);
			$this.m_unsubscribe=null;
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
			this.state={Focused: 'Chat'};
		};
		let after=_['base'].apply(this, arguments);
		if ('function'===typeof after) after(initialize);
		else initialize.call(this);
	}
	_['protected'].Node=function (role) {
		return _(this).m_view.Node(role);
	};

	_['public'].Slots=['header', 'canvas', 'chat', 'overlay'];
	_['public'].Text=function (key) {
		let english={tagline: 'Describe an edit to use local tools, or generate an image', help: 'Help', target: 'Target Media', conversation: 'Conversation', download: 'Download', empty: 'No media selected. Load an image or describe an idea in chat.', media: '＋ Media', camera: 'Camera', generating: 'Generating image…', history: 'Media versions', copyPrompt: 'Copy prompt', generate: 'Generate image from prompt', ratio: 'Output ratio', original: 'Original', input: 'Discuss an idea, draw a rectangle, inspect code, or create a local tool…', send: 'Send', stop: 'Stop', about: "Discuss image changes or ask for local operations. Only the Generate button creates a new image. You can also inspect and extend this session's code.", close: 'Close', confirmedChanges: 'Generation prompt', you: 'You', agent: 'Assistant', promptDraft: 'Combined prompt draft: ', copy: 'Copy', thinking: 'Thinking and running local operations…'};
		let chinese={tagline: '描述修改即可執行本地操作，也可選擇生成影像', help: '使用說明', target: '目前媒體 (Target Media)', conversation: '對話', download: '下載', empty: '尚未選擇媒體。請載入圖片，或在對話中描述構想。', media: '＋ 媒體庫', camera: '拍照', generating: 'AI 正在修訂影像…', history: '媒體版本', copyPrompt: '複製提示詞', generate: '依提示詞生成影像', ratio: '輸出比例', original: '原圖', input: '討論構想、畫矩形、查看程式碼，或編寫本地功能…', send: '傳送', stop: '停止', about: '可討論影像修改或要求本地操作。只有按下生成按鈕才會產生新影像，也可以要求查閱及擴充本次執行的程式碼。', close: '關閉', confirmedChanges: '生成提示詞', you: '您', agent: 'AI 助理 (Agent)', promptDraft: '整合提示詞草稿：', copy: '複製', thinking: '正在理解要求並處理本地操作…'};
		return ('zh'===_(this).m_view.GetLocale()?chinese:english)[key]||english[key]||key;
	};
	_['public'].Localize=function () { _(this).m_view.Localize((key)=>this.Text(key)); };

	_['public'].Mount=function (name, element, slot='header') { _(this).m_view.Mount(name, element, slot, this.Slots); };
	_['public'].Unmount=function (name) { _(this).m_view.Unmount(name); };
	_['public'].Mounted=function () { return _(this).m_view.Mounted(); };

	_['public'].componentDidMount=function () {
		let $this=_(this);
		$this.m_application.GetRuntime().UI=this;
		$this.m_unsubscribe=$this.m_application.Subscribe(()=>$this.Update());
		let root=$this.m_view.GetRoot();
		root.onclick=(event)=>{
			let target=event.target.closest?.('[data-action],[data-ratio]');
			if (!target||!root.contains(target)) return;
			if (target.dataset.ratio) { $this.m_application.SetRatio(target.dataset.ratio); return; }
			switch (target.dataset.action) {
				case 'media-window': new HtmlNode($this.Node('media-window')).SetStyle('display', ''); this.setState({Focused: 'Media'}); break;
				case 'chat-window': new HtmlNode($this.Node('chat-window')).SetStyle('display', ''); this.setState({Focused: 'Chat'}); break;
				case 'send': $this.m_application.IsConsulting()?$this.m_application.Stop():$this.Submit(); break;
				case 'select': $this.m_application.SelectMedia(); break;
				case 'camera': $this.m_application.CaptureCamera(); break;
				case 'download': $this.m_application.Download(); break;
				case 'generate': $this.m_application.Generate(); break;
				case 'info': new HtmlNode($this.Node('dialog')).SetStyle('display', 'flex'); break;
				case 'close-info': new HtmlNode($this.Node('dialog')).SetStyle('display', 'none'); break;
				case 'copy-prompt': navigator.clipboard.writeText($this.m_application.GetMedia().GetPrompt()||''); break;
			}
		};
		root.onkeydown=(event)=>{
			if (event.target===$this.Node('input')&&'Enter'===event.key&&!event.shiftKey&&!event.isComposing) {
				event.preventDefault();
				if (!$this.m_application.IsConsulting()) $this.Submit();
			}
		};
		$this.Update();
		$this.ArrangeModals();
		$this.m_application.SetReady($this.m_application.Welcome(navigator.language));
	};

	_['protected'].Update=function () {
		_(this).m_view.Update(_(this).m_application.GetMedia(), _(this).m_application.GetMessages(), _(this).m_application.IsConsulting(), (key)=>this.Text(key), (id)=>_(this).m_application.SelectVersion(id));
	};

	_['public'].componentWillUnmount=function () {
		let $this=_(this);
		_(this).m_application.Stop();
		let root=$this.m_view.GetRoot();
		if (root) root.onclick=root.onkeydown=null;
		let runtime=_(this).m_application.GetRuntime();
		if (runtime.UI===this) delete runtime.UI;
		for (let name of this.Mounted()) this.Unmount(name);
		$this.m_view.Dispose();
		$this.m_unsubscribe?.();
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
		return React.createElement('div', {ref: (element)=>$this.m_view.SetRoot(element), className: 'ca-app', 'data-role': 'app', style: {height: '100%', width: '100%'}},
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

	_['protected'].Submit=function () {
		let $this=_(this);
		let input=this.Node('input');
		let value=input?.value;
		if (input) input.value='';
		return $this.m_application.Send(value);
	};

	_['protected'].m_application=null;
	_['protected'].m_view=null;
	_['protected'].m_unsubscribe=null;
	_['protected'].m_templates=null;
	_['protected'].m_modals=null;
});
