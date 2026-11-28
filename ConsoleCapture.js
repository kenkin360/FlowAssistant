var ConsoleCapture=Function.extend(Object, function () {
	var _=this(ConsoleCapture);
	ConsoleCapture=_[ConsoleCapture];

	function ConsoleCapture() {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_entries=[];
		$this.m_listeners=new Set();
		$this.m_originals=new Map();
		$this.m_pending=false;
	}

	_['public'].Install=function () {
		let $this=_(this);
		if ($this.m_originals.size) return;
		for (let level of ['log', 'info', 'warn', 'error', 'debug']) {
			let original=console[level];
			$this.m_originals.set(level, original);
			console[level]=(...args)=>{
				try { this.Record(level, args); }
				catch (error) { original.call(console, 'Debug capture failed:', error); }
				return original.apply(console, args);
			};
		}
		if ('function'===typeof globalThis.addEventListener) {
			globalThis.addEventListener('error', (event)=>console.error('Uncaught error:', event.error??event.message));
			globalThis.addEventListener('unhandledrejection', (event)=>console.error('Unhandled rejection:', event.reason));
		}
	};
	_['public'].Record=function (level, args) {
		let $this=_(this);
		$this.m_entries.push(`[${new Date().toLocaleTimeString()}] ${level.toUpperCase()} ${args.map((value)=>this.Format(value)).join(' ')}`);
		if ($this.m_pending) return;
		$this.m_pending=true;
		queueMicrotask(()=>{
			$this.m_pending=false;
			for (let listener of $this.m_listeners) {
				try { listener(); }
				catch (error) { $this.m_originals.get('error')?.call(console, 'Debug listener failed:', error); }
			}
		});
	};
	_['public'].Format=function (value) {
		if (value instanceof Error) return value.stack||`${value.name}: ${value.message}`;
		if ('string'===typeof value) return value;
		try { return JSON.stringify(value)??String(value); }
		catch (error) { return String(value); }
	};
	_['public'].GetEntries=function () { return _(this).m_entries; };
	_['public'].Subscribe=function (listener) {
		_(this).m_listeners.add(listener);
		return ()=>_(this).m_listeners.delete(listener);
	};
	_['protected'].m_entries=null;
	_['protected'].m_listeners=null;
	_['protected'].m_originals=null;
	_['protected'].m_pending=false;

	ConsoleCapture.Default=new ConsoleCapture();
	ConsoleCapture.Default.Install();
});
