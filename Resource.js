import './Function.extend.js';

var Resource=Function.extend(Promise, function () {
	var _=this(Resource);
	Resource=_[Resource];

	function Resource(name, url, readyMember) {
		if (typeof name==='function') {
			_['base'].call(this, name);
			return;
		}
		let resolve;
		let reject;
		_['base'].call(this, (done, fail)=>{
			resolve=done;
			reject=fail;
		})(function () {
			_(this).m_state={
				Name: name
				, Url: url
				, ReadyMember: readyMember
				, Resolve: resolve
				, Reject: reject
				, Element: null
				, Created: false
				, Finished: false
				, Pending: null
				, Resolved: null
				, Interval: null
				, Timeout: null
				, LoadHandler: null
				, ErrorHandler: null
				, TimeoutHandler: null
			};
		});
	}

	_['protected'].Begin=function (tagName, loadHandler, check, append) {
		let $this=_(this);
		let state=$this.m_state;
		if (typeof document==='undefined') {
			$this.Finish(new Error('External resources require a browser environment'));
			return null;
		}
		state.LoadHandler=loadHandler;
		state.ErrorHandler=$this.HandleError.bind($this);
		state.TimeoutHandler=$this.HandleTimeout.bind($this);
		state.Timeout=setTimeout(state.TimeoutHandler, 15e3);
		if (check) {
			state.Interval=setInterval(loadHandler, 50);
			loadHandler();
		}
		if ((state.Finished)||(state.Pending)) {
			return null;
		}
		let id=state.Name+'-loader';
		state.Element=document.getElementById(id);
		if (state.Element) {
			$this.Watch();
			return state.Element;
		}
		state.Element=document.createElement(tagName);
		state.Created=true;
		state.Element.id=id;
		if ('async' in state.Element) {
			state.Element.async=true;
		}
		$this.Watch();
		state.Element.src=state.Url;
		if (append) {
			try {
				(document.head||document.body||document.documentElement).appendChild(state.Element);
			}
			catch (error) {
				$this.Finish(error);
			}
		}
		return state.Element;
	};

	_['protected'].Watch=function () {
		let state=_(this).m_state;
		state.Element.addEventListener('load', state.LoadHandler);
		state.Element.addEventListener('error', state.ErrorHandler);
	};

	_['protected'].GetState=function () {
		return _(this).m_state;
	};

	_['protected'].HandleError=function () {
		_(this).Finish(new Error('Failed to load external resource'));
	};

	_['protected'].HandleTimeout=function () {
		_(this).Finish(new Error('External resource initialization timed out'));
	};

	_['protected'].Finish=function (error, value) {
		let state=_(this).m_state;
		if (state.Finished) {
			return;
		}
		state.Finished=true;
		clearInterval(state.Interval);
		clearTimeout(state.Timeout);
		if (state.Element) {
			state.Element.removeEventListener('load', state.LoadHandler);
			state.Element.removeEventListener('error', state.ErrorHandler);
		}
		if (error) {
			if ((state.Created)&&(state.Element)) {
				state.Element.remove();
			}
			state.Reject(error);
		}
		else {
			state.Resolve(value);
		}
	};

	_['protected'].m_state=null;

	var Module=Function.extend(Resource, function () {
		var _=this(Module);
		Module=_[Module];

		function Module(name) {
			if (typeof name==='function') {
				_['base'].apply(this, arguments);
				return;
			}
			_['base'].apply(this, arguments)(function () {
				this.Start();
			});
		}

		_['public'].Start=function () {
			let $this=_(this);
			$this.m_checkHandler=$this.Check.bind($this);
			$this.Begin('script', $this.m_checkHandler, true, true);
		};

		_['protected'].Check=async function () {
			let $this=_(this);
			let state=$this.GetState();
			if (state.Finished) {
				return;
			}
			let value=state.Resolved||globalThis[state.Name];
			if ((value)&&(typeof value.then==='function')) {
				if (value===state.Pending) {
					return;
				}
				state.Pending=value;
				try {
					state.Resolved=await value;
				}
				catch (error) {
					$this.Finish(error);
					return;
				}
				if (state.Pending===value) {
					state.Pending=null;
					await $this.Check();
				}
				return;
			}
			if ((value)&&((!state.ReadyMember)||(value[state.ReadyMember]))) {
				globalThis[state.Name]=value;
				$this.Finish(null, value);
			}
		};

		_['protected'].m_checkHandler=null;
	});

	var Picture=Function.extend(Resource, function () {
		var _=this(Picture);
		Picture=_[Picture];

		function Picture(name) {
			if (typeof name==='function') {
				_['base'].apply(this, arguments);
				return;
			}
			_['base'].apply(this, arguments)(function () {
				this.Start();
			});
		}

		_['public'].Start=function () {
			let $this=_(this);
			$this.m_loadHandler=$this.Complete.bind($this);
			let element=$this.Begin('img', $this.m_loadHandler, false, false);
			if ((element)&&(element.complete)) {
				$this.m_loadHandler();
			}
		};

		_['protected'].Complete=async function () {
			let $this=_(this);
			let state=$this.GetState();
			if (state.Finished) {
				return;
			}
			try {
				if (typeof state.Element.decode==='function') {
					await state.Element.decode();
				}
				if (!state.Element.naturalWidth) {
					throw new Error('Failed to decode external picture');
				}
			}
			catch (error) {
				$this.Finish(error);
				return;
			}
			$this.Finish(null, state.Element);
		};

		_['protected'].m_loadHandler=null;
	});

	Resource.Module=Module;
	Resource.Picture=Picture;

	var Inline=Function.extend(Resource, function () {
		var _=this(Inline);
		Inline=_[Inline];

		function Inline(name, source, readyMember) {
			if (typeof name==='function') {
				_['base'].apply(this, arguments);
				return;
			}
			let url=`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
			_['base'].call(this, name, url, readyMember)(function () {
				this.Start();
			});
		}

		_['public'].Start=function () {
			let $this=_(this);
			let state=$this.GetState();
			if (typeof document==='undefined') {
				$this.Finish(new Error('Inline modules require a browser environment'));
				return;
			}
			let element=document.createElement('script');
			state.Element=element;
			state.Created=true;
			element.id=state.Name+'-loader';
			element.async=true;
			let finish=(error, value)=>{
				window.removeEventListener('error', state.EvaluationHandler, true);
				$this.Finish(error, value);
			};
			state.LoadHandler=()=>{
				try {
					let value=globalThis[state.Name];
					if (!value||typeof value.then==='function'||(state.ReadyMember&&!value[state.ReadyMember])) {
						throw new Error(`${state.Name} did not expose a ready module value.`);
					}
					finish(null, value);
				}
				catch (error) { finish(error); }
			};
			state.ErrorHandler=()=>finish(new Error(`Failed to load inline module ${state.Name}.`));
			state.EvaluationHandler=(event)=>{
				if (event.filename!==state.Url&&event.filename!==element.src) return;
				event.preventDefault();
				event.stopImmediatePropagation();
				let location=event.lineno?` at ${event.lineno}:${event.colno||1}`:'';
				let reason=event.error?.message||event.message||'Script evaluation failed';
				finish(new Error(`${state.Name}: ${event.error?.name||'Error'}: ${reason}${location}`));
			};
			window.addEventListener('error', state.EvaluationHandler, true);
			element.addEventListener('load', state.LoadHandler);
			element.addEventListener('error', state.ErrorHandler);
			try {
				element.src=state.Url;
				(document.head||document.body||document.documentElement).appendChild(element);
			}
			catch (error) { finish(error); }
		};
	});

	Resource.Inline=Inline;
});

export { Resource };
