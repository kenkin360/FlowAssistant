var AgentState=Function.extend(Object, function () {
	var _=this(AgentState);
	AgentState=_[AgentState];
	function AgentState() {
		_['base'].apply(this, arguments);
		this.ActiveMedia=null;
		this.CurrentMedia=null;
		this.History=[];
		this.IsGenerating=false;
		this.SelectedRatio='original';
		this.AccumulatedChanges=[];
		this.GenerationPrompt='';
		this.Messages=[];
		this.InputText='';
		this.IsConsulting=false;
		this.Labels=new Map();
		this.MediaIds=new Map();
		this.Files=new WeakMap();
	}
	_['public'].Remember=function (media, value) {
		if (!media||!value) return;
		if (value.title) this.Labels.set(media.Id, value.title);
		if (value.mediaId) this.MediaIds.set(media.Id, value.mediaId);
	};
	_['public'].AsMedia=function (value) {
		if (!value||value instanceof Media) return value;
		let file=this.Files.get(value);
		if (!file) {
			file=Media.From(value);
			this.Files.set(value, file);
		}
		return file;
	};
	_['public'].Apply=function (patch) {
		if ('activeMedia' in patch) {
			this.ActiveMedia=patch.activeMedia?this.AsMedia(patch.activeMedia):null;
			this.Remember(this.ActiveMedia, patch.activeMedia);
		}
		if ('currentMedia' in patch) {
			this.CurrentMedia=this.AsMedia(patch.currentMedia);
			this.Remember(this.CurrentMedia, patch.currentMedia);
		}
		if ('history' in patch) {
			this.History=patch.history.map((item)=>this.AsMedia(item));
			for (let i=0; i<this.History.length; i++) this.Remember(this.History[i], patch.history[i]);
		}
		if ('isGenerating' in patch) this.IsGenerating=patch.isGenerating;
		if ('selectedRatio' in patch) this.SelectedRatio=patch.selectedRatio;
		if ('accumulatedChanges' in patch) this.AccumulatedChanges=patch.accumulatedChanges.filter((item)=>'string'===typeof item);
		if ('generationPrompt' in patch) this.GenerationPrompt=patch.generationPrompt;
		if ('messages' in patch) this.Messages=patch.messages.map((entry)=>entry instanceof Message?entry:new Message({...entry, includedMedia: this.AsMedia(entry.includedMedia)}));
		if ('inputText' in patch) this.InputText=patch.inputText;
		if ('isConsulting' in patch) this.IsConsulting=patch.isConsulting;
	};
	_['public'].ToSnapshot=function () {
		let describe=(media)=>media?{...media.toJSON(), data: media.Data, title: this.Labels.get(media.Id), mediaId: this.MediaIds.get(media.Id)}:null;
		return {
			activeMedia: describe(this.ActiveMedia)
			, currentMedia: describe(this.CurrentMedia)
			, history: this.History.map(describe)
			, isGenerating: this.IsGenerating
			, selectedRatio: this.SelectedRatio
			, accumulatedChanges: this.AccumulatedChanges.slice()
			, generationPrompt: this.GenerationPrompt
			, messages: this.Messages.map((message)=>message.toJSON())
			, inputText: this.InputText
			, isConsulting: this.IsConsulting
		};
	};
	_['public'].ActiveMedia=null;
	_['public'].CurrentMedia=null;
	_['public'].History=null;
	_['public'].IsGenerating=null;
	_['public'].SelectedRatio=null;
	_['public'].AccumulatedChanges=null;
	_['public'].GenerationPrompt=null;
	_['public'].Messages=null;
	_['public'].InputText=null;
	_['public'].IsConsulting=null;
	_['public'].Labels=null;
	_['public'].MediaIds=null;
	_['public'].Files=null;
});
