var Sources=Function.extend(Object, function () {
	var _=this(Sources);
	Sources=_[Sources];
	function Sources(hostSourceUrl) {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_hostSourceUrl=hostSourceUrl;
		$this.m_installed=new Map();
	}
	_['protected'].GetCompiled=function () { return _(this).Parse(_(this).m_hostSourceUrl); };
	_['public'].CompiledNames=function () { try { return [..._(this).GetCompiled().keys()]; } catch (error) { console.error('Compiled source unavailable:', error); return []; } };
	_['protected'].GetEntries=function () {
		let entries=[...Bundle.Config
			, ['Function.extend.js', Bundle.SourceUrl('Function.extend.js')]
			, ['DrawRectangle', Bundle.SourceUrl('extensions/DrawRectangle.js')]
			, ['Upscale', Bundle.SourceUrl('extensions/Upscale.js')]
		];
		return entries.map(([name, url, readyMember])=>new Source(name, url, readyMember, true));
	};
	_['protected'].InstalledNames=function () { return [..._(this).m_installed.keys()]; };
	_['public'].GetInstalled=function (name) { return _(this).m_installed.get(name); };
	_['public'].SetInstalled=function (name, entry) {
		if (entry) _(this).m_installed.set(name, entry);
		else _(this).m_installed.delete(name);
	};
	_['protected'].Parse=function (url) {
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
			files.set(name, `${files.get(name)||''}${source.slice(start, end).replace(/^\/\/ virtual-export:default [^\r\n]+\r?\n/, '')}`);
		});
		return files;
	};
	_['public'].ReadCompiledSource=function (args) {
		if ('string'!==typeof args.file) return `
Compiled source files: ${JSON.stringify(this.CompiledNames())}
`;
		let compiled=_(this).GetCompiled();
		if (!compiled.has(args.file)) throw new Error(`
Compiled source file not found: ${args.file}
`);
		return `
${args.file}:
${compiled.get(args.file)}
`;
	};
	_['public'].ReadRemoteSource=async function (args) {
		let entries=_(this).GetEntries();
		if ('string'!==typeof args.name) return `
Remote source entries: ${JSON.stringify(entries)}
`;
		let entry=entries.find((item)=>item.Name===args.name||item.Value.split(/[?#]/)[0].split('/').pop()===args.name);
		if (!entry) throw new Error(`
Remote source not found: ${args.name}
`);
		let response=await fetch(entry.Value);
		if (!response.ok) throw new Error(`
Failed to read ${args.name}: HTTP ${response.status}
`);
		return `
${entry.Name}:
${await response.text()}
`;
	};
	_['public'].ReadInstalledSource=async function (args) {
		let sources=_(this).m_installed;
		if ('string'!==typeof args.name) return `
Installed modules: ${JSON.stringify(_(this).InstalledNames())}
`;
		let entry=sources.get(args.name);
		if (!entry) throw new Error(`
Installed module not found: ${args.name}
`);
		if (!entry.Remote) return `
${args.name}:
${entry.Value}
`;
		let response=await fetch(entry.Value);
		if (!response.ok) throw new Error(`
Failed to read ${args.name}: HTTP ${response.status}
`);
		return `
${args.name}:
${await response.text()}
`;
	};
	_['protected'].m_hostSourceUrl=null;
	_['protected'].m_installed=null;
});
