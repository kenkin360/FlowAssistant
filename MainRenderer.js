var MainRenderer=Function.extend(React.Component, function () {
	var _=this(MainRenderer);
	MainRenderer=_[MainRenderer];
	function MainRenderer(props) {
		let initialize=function () {
			let $this=_(this);
			$this.m_root=null;
			$this.m_urls=new Map();
			$this.m_mounted=new Map();
			$this.m_mediaRenderer=new MediaRenderer();
			$this.m_conversationRenderer=new ConversationRenderer();
			$this.m_mediator=new ConversationMediator();
			let workspace=new MediaWorkspace(()=>$this.Update());
			let assistant;
			let imageService=new ImageService(workspace, (event, value)=>$this.m_mediator.ReportResult(assistant, event, value));
			let methods=new Methods(props.HostSourceUrl, imageService);
			methods.ImageService=imageService;
			methods.VideoService=new VideoService(workspace);
			assistant=new Assistant(methods);
			$this.m_mediator.AddAssistant(assistant);
			$this.m_unsubscribe=null;
			$this.m_templates={
				Media: {__html: mediaTemplate}
				, Chat: {__html: conversationTemplate}
				, Shell: {__html: mainTemplate}
			};
			$this.m_modals={};
			this.state={Focused: 'Chat'};
		};
		let after=_['base'].apply(this, arguments);
		if ('function'===typeof after) after(initialize);
		else initialize.call(this);
	}
	_['protected'].Node=function (role) {
		return _(this).m_root?.querySelector(`[data-role="${role}"]`);
	};
	_['protected'].SetRoot=function (root) {
		let $this=_(this);
		$this.m_root=root;
		$this.m_mediaRenderer.SetRoot(root?.querySelector('[data-role="media-window"]'));
		$this.m_conversationRenderer.SetRoot(root?.querySelector('[data-role="chat-window"]'));
	};
	_['protected'].GetUrl=function (media) {
		if (!media?.Data) return '';
		let urls=_(this).m_urls;
		if (!urls.has(media)) urls.set(media, URL.createObjectURL(media.Data));
		return urls.get(media);
	};
	_['protected'].PruneUrls=function (media, messages) {
		let used=new Set([...media.History, ...messages.map((message)=>message.Attachment)]);
		for (let [entry, url] of _(this).m_urls) if (!used.has(entry)) {
			URL.revokeObjectURL(url);
			_(this).m_urls.delete(entry);
		}
	};

	_['public'].Slots=['header', 'canvas', 'chat', 'overlay'];
	_['public'].Text=function (key) {
		return DisplayText.GetText(_(this).GetLocale(), key);
	};
	_['protected'].GetLocale=function () {
		let locale=navigator.language||'en';
		return /^en(?:-|$)/i.test(locale)?'en':locale;
	};
	_['public'].Localize=function () {
		let root=_(this).m_root;
		if (!root) return;
		for (let node of root.querySelectorAll('[data-i18n]')) {
			if (Object.prototype.hasOwnProperty.call(DisplayText.Default.Entries, node.dataset.i18n)) node.textContent=this.Text(node.dataset.i18n);
		}
		for (let node of root.querySelectorAll('[data-i18n-placeholder]')) {
			if (Object.prototype.hasOwnProperty.call(DisplayText.Default.Entries, node.dataset.i18nPlaceholder)) node.placeholder=this.Text(node.dataset.i18nPlaceholder);
		}
	};

	_['public'].Mount=function (name, element, slot) {
		if (!name||!(element instanceof HTMLElement)||!this.Slots.includes(slot)) return false;
		try {
			let target=_(this).m_root?.querySelector(`[data-slot="${slot}"]`);
			if (!target) return false;
			let mounted=_(this).m_mounted;
			let previous=mounted.get(name);
			target.appendChild(element);
			if (previous&&previous!==element) previous.remove();
			mounted.set(name, element);
			return true;
		}
		catch (error) { console.error('Unable to mount UI element:', error); return false; }
	};
	_['public'].Unmount=function (name) {
		let mounted=_(this).m_mounted;
		mounted.get(name)?.remove();
		mounted.delete(name);
	};
	_['public'].Mounted=function () { return [..._(this).m_mounted.keys()]; };

	_['public'].componentDidMount=function () {
		let $this=_(this);
		$this.m_unsubscribe=$this.m_mediator.Subscribe(()=>$this.Update());
		let root=$this.m_root;
		root.onclick=(event)=>{ $this.HandleClick(event).catch((error)=>$this.ReportError(error)); };
		root.onkeydown=(event)=>{ $this.HandleKeyDown(event).catch((error)=>$this.ReportError(error)); };
		$this.Update();
		$this.ArrangeModals();
		DisplayText.GetInstance($this.GetLocale()).then(()=>{
			if (!$this.m_root) return;
			this.forceUpdate();
			$this.Update();
		}).catch((error)=>$this.ReportError(error));
		$this.m_mediator.Start(navigator.language).catch((error)=>$this.ReportError(error));
	};

	_['protected'].ReportError=function (error) {
		console.error('UI event failed:', error);
		_(this).m_mediator.ReportError(error);
	};
	_['protected'].HandleClick=async function (event) {
		let $this=_(this);
		let root=$this.m_root;
		let target=event.target.closest?.('[data-control],[data-ratio]');
		if (!target||!root?.contains(target)) return;
		if (this.Node('media-window')?.contains(target)) {
			let methods=$this.m_mediator.GetAssistant().GetMethods();
			await $this.m_mediaRenderer.HandleClick(event, methods.ImageService, methods.VideoService);
			return;
		}
		if (this.Node('chat-window')?.contains(target)) {
			await $this.m_conversationRenderer.HandleClick(event, $this.m_mediator,
				()=>this.GetActiveMedia());
			return;
		}
		switch (target.dataset.control) {
			case 'media-window': new HtmlNode(this.Node('media-window')).SetStyle('display', ''); this.setState({Focused: 'Media'}); break;
			case 'chat-window': new HtmlNode(this.Node('chat-window')).SetStyle('display', ''); this.setState({Focused: 'Chat'}); break;
			case 'info': new HtmlNode(this.Node('dialog')).SetStyle('display', 'flex'); break;
			case 'close-info': new HtmlNode(this.Node('dialog')).SetStyle('display', 'none'); break;
		}
	};
	_['protected'].HandleKeyDown=async function (event) {
		return _(this).m_conversationRenderer.HandleKeyDown(event, _(this).m_mediator,
			()=>this.GetActiveMedia());
	};
	_['protected'].GetActiveMedia=function () {
		return _(this).m_mediator.GetAssistant().GetMethods().ImageService.GetWorkspace().GetActiveMedia();
	};

	_['protected'].Update=function () {
		let imageService=_(this).m_mediator.GetAssistant().GetMethods().ImageService;
		let workspace=imageService.GetWorkspace();
		let messages=_(this).m_mediator.GetMessages();
		this.Localize();
		_(this).m_mediaRenderer.Update(workspace, imageService.IsGenerating(), (key)=>this.Text(key), (id)=>workspace.SelectVersion(id), (media)=>this.GetUrl(media));
		_(this).m_conversationRenderer.Update(messages, _(this).m_mediator.IsConsulting(), (key)=>this.Text(key), (media)=>this.GetUrl(media), this.GetLocale());
		_(this).PruneUrls(workspace, messages);
	};

	_['public'].componentWillUnmount=function () {
		let $this=_(this);
		_(this).m_mediator.Stop();
		let root=$this.m_root;
		if (root) root.onclick=root.onkeydown=null;
		for (let name of this.Mounted()) this.Unmount(name);
		$this.m_mediaRenderer.Dispose();
		for (let url of $this.m_urls.values()) URL.revokeObjectURL(url);
		$this.m_urls.clear();
		$this.m_unsubscribe?.();
	};

	_['protected'].ArrangeModals=function (name) {
		let root=_(this).m_root;
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
		return React.createElement('div', {ref: (element)=>$this.SetRoot(element), className: 'ca-app', 'data-role': 'app', style: {height: '100%', width: '100%'}},
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

	_['protected'].m_mediator=null;
	_['protected'].m_root=null;
	_['protected'].m_urls=null;
	_['protected'].m_mounted=null;
	_['protected'].m_mediaRenderer=null;
	_['protected'].m_conversationRenderer=null;
	_['protected'].m_unsubscribe=null;
	_['protected'].m_templates=null;
	_['protected'].m_modals=null;
});
