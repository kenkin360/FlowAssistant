var Sources=Function.extend(Object, function () {
	var _=this(Sources);
	Sources=_[Sources];
	function Sources(entries, hostSourceUrl) {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_entries=[...(entries||[]), ['DrawRectangle', Bundle.CustomAgent('extensions/DrawRectangle.js')], ['Upscale', Bundle.CustomAgent('extensions/Upscale.js')]].map(([name, url, readyMember])=>new Source(name, url, readyMember));
		$this.m_compiled=new Map();
		$this.m_error=null;
		try { $this.m_compiled=$this.Parse(hostSourceUrl); }
		catch (error) { $this.m_error=error; }
		$this.m_installed=new Map();
	}
	_['public'].CompiledNames=function () { return [..._(this).m_compiled.keys()]; };
	_['public'].InstalledNames=function () { return [..._(this).m_installed.keys()]; };
	_['public'].GetInstalled=function (name) { return _(this).m_installed.get(name); };
	_['public'].SetInstalled=function (name, entry) {
		if (entry) _(this).m_installed.set(name, entry);
		else _(this).m_installed.delete(name);
	};
	_['private'].Parse=function (url) {
		let prefix='data:text/javascript;base64,';
		if (!url?.startsWith(prefix)) throw new Error('The bundled source is unavailable from import.meta.url.');
		let bytes=Uint8Array.from(atob(url.slice(prefix.length)), (char)=>char.charCodeAt(0));
		let source=new TextDecoder().decode(bytes);
		let markers=[...source.matchAll(/^\/\/ virtual:([^\r\n]+)\r?\n/gm)];
		if (!markers.length) return new Map([['bundle', source]]);
		let files=new Map();
		markers.forEach((marker, index)=>{
			let start=marker.index+marker[0].length;
			let end=index+1<markers.length?markers[index+1].index:source.length;
			let name=marker[1].trim();
			files.set(name, (files.get(name)||'')+source.slice(start, end).replace(/^\/\/ virtual-export:default [^\r\n]+\r?\n/, ''));
		});
		return files;
	};
	_['public'].ReadCompiledSource=function (args={}) {
		let $this=_(this);
		if ($this.m_error) throw $this.m_error;
		if ('string'!==typeof args.file) return {message: `Compiled source files: ${JSON.stringify(this.CompiledNames())}`};
		if (!$this.m_compiled.has(args.file)) throw new Error('Compiled source file not found: '+args.file);
		return {message: `${args.file}:\n${$this.m_compiled.get(args.file)}`};
	};
	_['public'].ReadRemoteSource=async function (args={}) {
		let entries=_(this).m_entries;
		if ('string'!==typeof args.name) return {message: `Remote source entries: ${JSON.stringify(entries.map((entry)=>({name: entry.Name, url: entry.Value, readyMember: entry.ReadyMember})))}`};
		let entry=entries.find((item)=>item.Name===args.name||item.Value.split(/[?#]/)[0].split('/').pop()===args.name);
		if (!entry) throw new Error('Remote source not found: '+args.name);
		let response=await fetch(entry.Value);
		if (!response.ok) throw new Error(`Failed to read ${args.name}: HTTP ${response.status}`);
		return {message: `${entry.Name}:\n${await response.text()}`};
	};
	_['public'].ReadInstalledSource=async function (args={}) {
		let sources=_(this).m_installed;
		if ('string'!==typeof args.name) return {message: `Installed modules: ${JSON.stringify(this.InstalledNames())}`};
		let entry=sources.get(args.name);
		if (!entry) throw new Error('Installed module not found: '+args.name);
		if (!entry.Remote) return {message: `${args.name}:\n${entry.Value}`};
		let response=await fetch(entry.Value);
		if (!response.ok) throw new Error(`Failed to read ${args.name}: HTTP ${response.status}`);
		return {message: `${args.name}:\n${await response.text()}`};
	};
	_['private'].m_entries=null;
	_['private'].m_compiled=null;
	_['private'].m_error=null;
	_['private'].m_installed=null;
});
