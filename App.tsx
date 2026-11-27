import './Function.extend.js';
import React from 'react';
import { Flow } from 'flow-sdk';
import * as fabric from 'fabric';
import { Bundle } from './Bundle.js';
import { Resource } from './Resource.js';

var App=Function.extend(React.Component, function () {
	var _=this(App);
	App=_[App];

	function App(props) {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_renderer=null;
		$this.m_error=null;
		$this.m_loading=false;
		$this.m_progress={File: '', Completed: 0, Total: Bundle.Config.length};
		$this.m_reload=()=>_(this).Load(this);
	}

	_['public'].componentDidMount=function () {
		Object.assign(globalThis, {React, Flow, fabric, App, Bundle, Resource});
		_(this).Load(this);
	};

	_['protected'].Load=function (component) {
		let $this=_(component);
		if ($this.m_loading) return;
		$this.m_loading=true;
		$this.m_error=null;
		$this.m_progress={File: '', Completed: 0, Total: Bundle.Config.length};
		component.forceUpdate();
		Bundle.Load((progress)=>{
			$this.m_progress=progress;
			component.forceUpdate();
		}).then((loaded)=>{
			$this.m_loading=false;
			$this.m_renderer=loaded.MainRenderer;
			component.forceUpdate();
		}, (error)=>{
			$this.m_loading=false;
			$this.m_error=error;
			console.error(error);
			component.forceUpdate();
		});
	};

	_['public'].render=function () {
		let $this=_(this);
		if ($this.m_renderer) return React.createElement($this.m_renderer, {...this.props, HostSourceUrl: import.meta.url, SourceFiles: Bundle.Config});
		let progress=$this.m_progress;
		let percent=progress.Total?Math.round(progress.Completed*100/progress.Total):0;
		let chinese=/^zh\b/i.test(navigator.language||'');
		return React.createElement('div', {style: {position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#090e19', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif'}},
			React.createElement('div', {style: {width: 360, maxWidth: '85vw'}},
				React.createElement('h2', null, 'FlowAssistant'),
				React.createElement('div', {style: {fontSize: 12, marginBottom: 8}}, $this.m_error?String($this.m_error.message||$this.m_error):progress.File||(chinese?'啟動中…':'Starting…')),
				React.createElement('div', {role: 'progressbar', 'aria-valuenow': progress.Completed, 'aria-valuemin': 0, 'aria-valuemax': progress.Total, style: {height: 5, background: '#263248', borderRadius: 5}},
					React.createElement('div', {style: {height: '100%', width: percent+'%', background: '#6959ff', borderRadius: 5}})),
				React.createElement('div', {style: {fontSize: 11, marginTop: 6, textAlign: 'right'}}, `${progress.Completed} / ${progress.Total}`),
				$this.m_error&&React.createElement('button', {type: 'button', onClick: $this.m_reload, style: {marginTop: 12, padding: '7px 14px'}}, chinese?'重新載入':'Reload')));
	};

	_['protected'].m_renderer=null;
	_['protected'].m_error=null;
	_['protected'].m_loading=false;
	_['protected'].m_progress=null;
	_['protected'].m_reload=null;
});

export default App;
