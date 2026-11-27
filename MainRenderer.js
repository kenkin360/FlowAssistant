var MainRenderer=Function.extend(React.Component, function () {
	var _=this(MainRenderer);
	MainRenderer=_[MainRenderer];
	function MainRenderer(props) {
		let initialize=function () {
			let $this=_(this);
			$this.m_view=new View();
			$this.m_assistant=new Assistant(props.HostSourceUrl);
			$this.m_unsubscribe=null;
			let template=document.createElement('template');
			template.innerHTML=agentTemplate;
			let shell=template.content.querySelector('.ca-app');
			let media=shell.querySelector('.ca-left');
			let chat=shell.querySelector('.ca-right');
			$this.m_templates={Media: {__html: media.outerHTML}, Chat: {__html: chat.outerHTML}};
			media.remove();
			chat.remove();
			shell.querySelector('.ca-work').remove();
			$this.m_templates.Shell={__html: template.content.querySelector('style').outerHTML+shell.innerHTML};
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
		return DisplayText.GetText(_(this).m_view.GetLocale(), key);
	};
	_['public'].Localize=function () { _(this).m_view.Localize((key)=>this.Text(key)); };

	_['public'].Mount=function (name, element, slot='header') { _(this).m_view.Mount(name, element, slot, this.Slots); };
	_['public'].Unmount=function (name) { _(this).m_view.Unmount(name); };
	_['public'].Mounted=function () { return _(this).m_view.Mounted(); };

	_['public'].componentDidMount=function () {
		let $this=_(this);
		$this.m_unsubscribe=$this.m_assistant.Subscribe(()=>$this.Update());
		let root=$this.m_view.GetRoot();
		root.onclick=(event)=>{
			let target=event.target.closest?.('[data-action],[data-ratio]');
			if (!target||!root.contains(target)) return;
			let imageService=$this.m_assistant.GetMethods().ImageService;
			let workspace=imageService.GetWorkspace();
			if (target.dataset.ratio) { workspace.SetRatio(target.dataset.ratio); return; }
			switch (target.dataset.action) {
				case 'media-window': new HtmlNode($this.Node('media-window')).SetStyle('display', ''); this.setState({Focused: 'Media'}); break;
				case 'chat-window': new HtmlNode($this.Node('chat-window')).SetStyle('display', ''); this.setState({Focused: 'Chat'}); break;
				case 'send': $this.m_assistant.IsConsulting()?$this.m_assistant.Stop():$this.Submit(); break;
				case 'select': imageService.SelectCurrent(); break;
				case 'camera': imageService.CaptureCurrent(); break;
				case 'download':
					if (workspace.GetActiveMedia() instanceof Media.Video) $this.m_assistant.GetMethods().VideoService.DownloadCurrent(workspace).catch((error)=>$this.m_assistant.ReportError(error));
					else imageService.DownloadCurrent();
					break;
				case 'generate': imageService.GenerateCurrent(); break;
				case 'info': new HtmlNode($this.Node('dialog')).SetStyle('display', 'flex'); break;
				case 'close-info': new HtmlNode($this.Node('dialog')).SetStyle('display', 'none'); break;
				case 'copy-prompt': navigator.clipboard.writeText(workspace.GetPrompt()||''); break;
			}
		};
		root.onkeydown=(event)=>{
			if (event.target===$this.Node('input')&&'Enter'===event.key&&!event.shiftKey&&!event.isComposing) {
				event.preventDefault();
				if (!$this.m_assistant.IsConsulting()) $this.Submit();
			}
		};
		$this.Update();
		$this.ArrangeModals();
		DisplayText.GetInstance($this.m_view.GetLocale()).then(()=>{
			if (!$this.m_view.GetRoot()) return;
			this.forceUpdate();
			this.Update();
		});
		$this.m_assistant.SetReady(new ConversationOpening($this.m_assistant).Start(navigator.language));
	};

	_['protected'].Update=function () {
		let imageService=_(this).m_assistant.GetMethods().ImageService;
		let workspace=imageService.GetWorkspace();
		_(this).m_view.Update(workspace, _(this).m_assistant.GetMessages(), _(this).m_assistant.IsConsulting(), imageService.IsGenerating(), (key)=>this.Text(key), (id)=>workspace.SelectVersion(id));
	};

	_['public'].componentWillUnmount=function () {
		let $this=_(this);
		_(this).m_assistant.Stop();
		let root=$this.m_view.GetRoot();
		if (root) root.onclick=root.onkeydown=null;
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
		return $this.m_assistant.Send(value);
	};

	_['protected'].m_assistant=null;
	_['protected'].m_view=null;
	_['protected'].m_unsubscribe=null;
	_['protected'].m_templates=null;
	_['protected'].m_modals=null;
});
