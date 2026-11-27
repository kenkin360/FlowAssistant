var AppActions=Function.extend(Object, function () {
	var _=this(AppActions);
	AppActions=_[AppActions];
	function AppActions(sourceUrl, notify, changed) {
		_['base'].apply(this, arguments);
		_(this).m_modules=new Modules(new Sources(sourceUrl));
		_(this).m_mediaOperations=new MediaOperations(new MediaWorkspace(), notify, changed);
		_(this).m_executor=new ActionExecutor(_(this).m_modules, _(this).m_mediaOperations, (args)=>this.InspectRuntime(args));
	}
	_['public'].GetInstruction=function () { return _(this).m_modules.GetInstruction()+'\n本輪載入模組：'+_(this).m_modules.DescribeDynamic()+'\n'+_(this).m_mediaOperations.GetInstruction(); };
	_['public'].GetMediaOperations=function () { return _(this).m_mediaOperations; };
	_['public'].GetMedia=function () { return _(this).m_mediaOperations.GetMedia(); };
	_['public'].NormalizeAttachment=function (value) { return this.GetMedia().ToMedia(value); };
	_['public'].DescribeActions=function () {
		return [...ActionExecutor.BuiltinActions, 'resetConversation', ...this.GetNames()].join(', ');
	};
	_['public'].InspectRuntime=function (args={}) {
		let runtime=this.GetRuntime();
		if ('string'===typeof args.name) {
			let fn=runtime.Modules[args.name]?.Run;
			if ('function'!==typeof fn) throw new Error('Runtime function not found: '+args.name);
			return {message: `${args.name}: ${fn.Description||String(fn)}`};
		}
		let modules=_(this).m_modules;
		return {message: `Callable modules: ${this.GetNames().map((name)=>name+(runtime.Modules[name].Run.Description?': '+runtime.Modules[name].Run.Description:'')).join('; ')||'(none)'}. Loaded modules: ${Object.keys(runtime.Modules).join(', ')||'(none)'}. Compiled source files: ${JSON.stringify(modules.GetSources().CompiledNames())}. Reversible installations: ${modules.GetVersionCount()}. Built-in actions: ${this.DescribeActions()}.`};
	};

	_['public'].GetRuntime=function () { return _(this).m_modules.GetRuntime(); };
	_['public'].GetNames=function () { return _(this).m_modules.GetNames(); };
	_['public'].HasVersion=function () { return _(this).m_modules.HasVersion(); };
	_['public'].Rollback=function () { return _(this).m_modules.Rollback(); };
	_['public'].Initialize=function () { return _(this).m_modules.Initialize(); };
	_['public'].GetRequest=async function (message, reports, plan, messages, instruction) {
		let prior=messages.slice();
		if (prior.at(-1)?.Sender==='user'&&prior.at(-1)?.Text===message) prior.pop();
		let history=prior.slice(-20).map((entry)=>entry.Sender+': '+entry.Text).join('\n\n');
		let context=await _(this).m_mediaOperations.GetRequestContext();
		let prompt=context.Text+'\n先前對話：\n'+history+'\n本輪要求：\n'+message;
		if (reports.length) prompt+='\n目前操作計畫：'+JSON.stringify(plan)+'\n實際結果：\n'+reports.map(JSON.stringify).join('\n')+'\n請依結果決定下一步或回答。';
		let options={systemInstruction: instruction};
		if (context.Images.length) options.images=context.Images;
		return {Prompt: prompt, Options: options};
	};
	_['public'].RunRequestedAction=async function (action, response) {
		let result=await _(this).m_executor.RunAction(action, true, response.source, response.Type);
		return result;
	};
	_['public'].CompleteResponse=function (answer, responses, artifact) { return _(this).m_mediaOperations.ApplyResponse(responses, artifact); };

	_['public'].DescribeResult=function (result) { return result.artifact?_(this).m_mediaOperations.Describe(result.artifact):null; };
	_['public'].DescribeDynamic=function () { return _(this).m_modules.DescribeDynamic(); };
	_['protected'].m_modules=null;
	_['protected'].m_mediaOperations=null;
	_['protected'].m_executor=null;
});
