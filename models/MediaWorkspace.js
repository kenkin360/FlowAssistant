var MediaWorkspace=Function.extend(Object, function () {
	var _=this(MediaWorkspace);
	MediaWorkspace=_[MediaWorkspace];
	function MediaWorkspace(changed) {
		_['base'].apply(this, arguments);
		this.History=[];
		this.Prompt='';
		this.Ratio='original';
		_(this).m_changed=changed;
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
	_['public'].NotifyChanged=function () { _(this).m_changed?.(); };
	_['public'].SetRatio=function (ratio) {
		if (!['original', '1:1', '16:9', '9:16', '4:3', '3:4'].includes(ratio)) throw new Error('Unsupported aspect ratio.');
		this.Apply({selectedRatio: ratio});
	};
	_['public'].SetPrompt=function (prompt) { this.Apply({generationPrompt: prompt}); };
	_['public'].SelectVersion=function (id) {
		let media=this.History.find((item)=>item.Id===id);
		if (!media) throw new Error('Media version not found: '+id);
		this.Apply({activeMedia: media, currentMedia: media});
	};
	_['public'].Add=function (value) {
		let media=this.ToMedia(value);
		if (media instanceof Media.Image||media instanceof Media.Video) {
			this.Apply(this.History.includes(media)?{activeMedia: media, currentMedia: media}:{activeMedia: media, currentMedia: media, history: [media, ...this.History]});
		}
		else this.Apply({currentMedia: media});
		return media;
	};
	_['public'].GetLegacyMedia=async function (media) {
		if (!media) return null;
		return {...media.toJSON(), base64: media.Data?await media.ToBase64():undefined};
	};
	_['public'].Describe=function (media) {
		if (!media) return null;
		return {type: media instanceof Media.Image?'image':media instanceof Media.Video?'video':'media',
			id: media.Id, title: media.Title, mimeType: media.MimeType, mediaId: media.MediaId,
			...(media instanceof Media.Image?{width: media.Width, height: media.Height}:{}),
			...(media instanceof Media.Video?{durationSeconds: media.DurationSeconds, resolution: media.Resolution}:{})};
	};
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
		this.NotifyChanged();
	};
	_['public'].History=null;
	_['public'].Prompt=null;
	_['public'].Ratio=null;
	_['protected'].m_selectedId=null;
	_['protected'].m_artifact=null;
	_['protected'].m_changed=null;
});
