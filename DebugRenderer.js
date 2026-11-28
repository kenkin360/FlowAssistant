var DebugRenderer=Function.extend(React.Component, function () {
	var _=this(DebugRenderer);
	DebugRenderer=_[DebugRenderer];

	function DebugRenderer(props) {
		let initialize=function () {
			_(this).m_unsubscribe=null;
			_(this).m_output=null;
			this.state={Opened: false};
		};
		let after=_['base'].apply(this, arguments);
		if ('function'===typeof after) after(initialize);
		else initialize.call(this);
	}

	_['public'].Open=function () { this.setState({Opened: true}); };
	_['public'].Close=function () { this.setState({Opened: false}); };
	_['public'].componentDidMount=function () {
		_(this).m_unsubscribe=this.props.Capture.Subscribe(()=>this.forceUpdate());
	};
	_['public'].componentDidUpdate=function () {
		let output=_(this).m_output;
		if (output) output.scrollTop=output.scrollHeight;
	};
	_['public'].componentWillUnmount=function () {
		_(this).m_unsubscribe?.();
	};
	_['public'].render=function () {
		if (!this.state.Opened) return null;
		let $this=_(this);
		return React.createElement('div', {className: 'ca-window', 'data-role': 'debug-window'},
			React.createElement(Modal, {
				title: 'Debug'
				, defaultSize: {width: Math.min(700, window.innerWidth), height: Math.min(450, window.innerHeight)}
				, getContentMinimumSize: ()=>({width: 300, height: 200})
				, allowContentWheel: true
				, zIndex: 60
				, onClose: ()=>this.Close()
			}, React.createElement('div', {
				ref: (element)=>{ $this.m_output=element; }
				, style: {height: '100%', overflow: 'auto', padding: 12, background: '#090e19', color: '#e5e7eb'}
			}, React.createElement('pre', {
				style: {margin: 0, font: '12px/1.5 monospace', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', userSelect: 'text'}
			}, this.props.Capture.GetEntries().join('\n\n')))));
	};

	_['protected'].m_unsubscribe=null;
	_['protected'].m_output=null;
});
