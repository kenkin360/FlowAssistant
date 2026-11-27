var MediaWorkspace=Function.extend(Object, function () {
	var _=this(MediaWorkspace);
	MediaWorkspace=_[MediaWorkspace];
	function MediaWorkspace() {
		_['base'].apply(this, arguments);
		this.History=[];
		this.Prompt='';
		this.Ratio='original';
		_(this).m_selectedId=null;
		_(this).m_artifact=null;
	}
	_['public'].GetActiveMedia=function () {
		return this.History.find((item)=>item.Id===_(this).m_selectedId)||null;
	};
	_['public'].GetCurrentMedia=function () {
		return _(this).m_artifact||this.GetActiveMedia()||this.History[0]||null;
	};
	_['public'].GetPrompt=function () { return this.Prompt; };
	_['public'].GetRatio=function () { return this.Ratio; };
	_['public'].ToMedia=function (value) {
		if (!value||value instanceof Media) return value;
		return this.History.find((entry)=>entry.Id===value.id)||Media.From(value);
	};
	_['public'].Apply=function (patch) {
		let converted=new Map();
		let resolve=(value)=>{
			if (!value) return null;
			if (value instanceof Media) return value;
			if (!converted.has(value)) converted.set(value, this.ToMedia(value));
			return converted.get(value);
		};
		if ('history' in patch) this.History=patch.history.map(resolve);
		if ('activeMedia' in patch) {
			let active=resolve(patch.activeMedia);
			_(this).m_selectedId=active?.Id||null;
		}
		if ('currentMedia' in patch) {
			let current=resolve(patch.currentMedia);
			_(this).m_artifact=current&&!this.History.includes(current)?current:null;
		}
		if ('selectedRatio' in patch) this.Ratio=patch.selectedRatio;
		if ('generationPrompt' in patch) this.Prompt=patch.generationPrompt;
	};
	_['public'].History=null;
	_['public'].Prompt=null;
	_['public'].Ratio=null;
	_['protected'].m_selectedId=null;
	_['protected'].m_artifact=null;
});
