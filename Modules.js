var Modules=Function.extend(Object, function () {
	var _=this(Modules);
	Modules=_[Modules];
	function Modules(sources) {
		_['base'].apply(this, arguments);
		let $this=_(this);
		$this.m_sources=sources;
		$this.m_versions=[];
		$this.m_startup=null;
	}
	_['protected'].GetVersionCount=function () { return _(this).m_versions.length; };
	_['public'].GetStartup=function () { return _(this).m_startup; };
	_['public'].GetRuntime=function () {
		let runtime=globalThis.ModuleRuntime||=Object.create(null);
		runtime.Modules||=Object.create(null);
		return runtime;
	};
	_['protected'].GetNames=function () {
		let modules=this.GetRuntime().Modules;
		return Object.keys(modules).filter((name)=>typeof modules[name]?.Run==='function');
	};
	_['public'].InspectRuntime=function (args) {
		let runtime=this.GetRuntime();
		if ('string'===typeof args.name) {
			let method=runtime.Modules[args.name]?.Run;
			if ('function'!==typeof method) throw new Error(`
Method not found: ${args.name}.Run
`);
			return `
${args.name}.Run：${method.Description||String(method)}
`;
		}
		let names=_(this).GetNames();
		let descriptions=names.map((name)=>{
			let description=runtime.Modules[name].Run.Description;
			let methodName=`${name}.Run`;
			return description?`${methodName}：${description}`:methodName;
		});
		return `
可呼叫模組：${descriptions.join('；')||'無'}。
編譯原碼：${JSON.stringify(_(this).m_sources.CompiledNames())}。
可回復的模組安裝：${_(this).GetVersionCount()}。
`;
	};
	_['protected'].RestoreGlobal=function (name, descriptor) {
		if (descriptor) descriptor.Restore(globalThis, name);
		else if (!delete globalThis[name]) globalThis[name]=undefined;
	};
	_['public'].Rollback=function () {
		let $this=_(this);
		let installation=$this.m_versions.at(-1);
		if (!installation) throw new Error('No previous module installation is available.');
		$this.RestoreGlobal(installation.Name, installation.PreviousGlobal);
		if (installation.PreviousModule) installation.PreviousModule.Restore(this.GetRuntime().Modules, installation.Name);
		else delete this.GetRuntime().Modules[installation.Name];
		$this.m_sources.SetInstalled(installation.Name, installation.PreviousSource);
		$this.m_versions.pop();
		return `
Restored the previous module definition and registration. ${$this.m_versions.length} earlier installations remain.
`;
	};
	_['public'].Initialize=function () {
		let $this=_(this);
		if (!$this.m_startup) {
			$this.m_startup=(async ()=>{
				await $this.LoadModule(Bundle.SourceUrl('extensions/DrawRectangle.js'), 'DrawRectangle', Resource.Module, undefined, false);
				await $this.LoadModule(Bundle.SourceUrl('extensions/Upscale.js'), 'Upscale', Resource.Module, undefined, false);
			})().catch((error)=>{
				$this.m_startup=null;
				throw error;
			});
		}
		return $this.m_startup;
	};
	_['protected'].Register=function (name, value, source, remote, track, previousGlobal) {
		if (value==null) throw new Error(`
${name} did not expose a module value.
`);
		let runtime=this.GetRuntime();
		if (undefined!==value.Run&&'function'!==typeof value.Run) throw new Error(`
${name} has an invalid Run method.
`);
		let installation=new Installation(name, previousGlobal, Binding.Capture(runtime.Modules, name), this.m_sources.GetInstalled(name));
		runtime.Modules[name]=value;
		this.m_sources.SetInstalled(name, new Source(name, source, undefined, remote));
		if (track) this.m_versions.push(installation);
		return `
${name} loaded. Callable: ${'function'===typeof value.Run?'Run':'(none)'}. Reversible installations: ${this.m_versions.length}.
`;
	};
	_['protected'].LoadModule=async function (source, name, Type, readyMember, track) {
		let $this=_(this);
		if ('string'!==typeof name||!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error('Provide a module name.');
		if ('string'!==typeof source||!source.trim()) throw new Error('Provide module source or a script URL.');
		if ('function'!==typeof Type||!(Type.prototype instanceof Resource)) throw new Error('Provide a Resource type for the module.');
		let remote=Type===Resource.Module||Type.prototype instanceof Resource.Module;
		if (remote&&$this.GetRuntime().Modules[name]) return `
${name} is already loaded.
`;
		let previousGlobal=Binding.Capture(globalThis, name);
		try {
			let value=await new Type(name, source, readyMember);
			return $this.Register(name, value, source, remote, track, previousGlobal);
		}
		catch (error) {
			try { $this.RestoreGlobal(name, previousGlobal); }
			catch (restoreError) { console.error('Module restoration failed:', restoreError); }
			throw error;
		}
	};
	_['public'].Install=function (args) {
		let type='javascript'===args.sourceType||'js'===args.sourceType?Resource.Inline:['text', 'url'].includes(args.sourceType)?Resource.Module:null;
		if (!type) throw new Error('sourceType must be javascript, js, text, or url.');
		return _(this).LoadModule(args.source, args.name, type, args.readyMember, true);
	};
	_['protected'].DescribeDynamic=function () {
		let names=[...new Set(_(this).m_versions.map((installation)=>installation.Name))];
		return names.length?names.join(', '):'(無)';
	};
	_['public'].GetInstruction=function () {
		return `
原碼查閱：Sources.ReadCompiledSource、Sources.ReadRemoteSource、Sources.ReadInstalledSource；省略檔名可列出來源。現有模組：Modules.InspectRuntime。
要編寫新模組時，先以 Sources.ReadRemoteSource 查閱相近模組的實際原碼，依其 Function.extend 宣告、公開方法與靜態 Run 的方式編寫完整 JavaScript。
使用 Modules.Install，Arguments 為 {"name":"類型名稱","source":"完整 JavaScript 原碼","sourceType":"javascript"}。頂層 var 名稱須與 name 相同，並公開靜態 Run(args)。source 是 JSON 字串，其中的換行以 \\n 表示。
安裝結果會交還給你；安裝完成後呼叫 類型名稱.Run，依執行結果回答。撤銷安裝：Modules.Rollback。清空對話：Conversation.Clear。本輪載入模組：${_(this).DescribeDynamic()}。
`;
	};
	_['protected'].m_sources=null;
	_['protected'].m_versions=null;
	_['protected'].m_startup=null;
});
