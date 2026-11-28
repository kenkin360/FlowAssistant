var MediaWorkspace=Function.extend(Object, function () {
	var _=this(MediaWorkspace);
	MediaWorkspace=_[MediaWorkspace];
	function MediaWorkspace(changed) {
		_['base'].apply(this, arguments);
		this.History=[];
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
	_['public'].NotifyChanged=function () { _(this).m_changed?.(); };
	_['public'].SelectVersion=function (id) {
		let media=this.History.find((item)=>item.Id===id);
		if (!media) return null;
		_(this).m_selectedId=media.Id;
		_(this).m_artifact=null;
		this.NotifyChanged();
		return media;
	};
	_['public'].Add=function (value) {
		let media=this.ToMedia(value);
		if (media instanceof Media.Image||media instanceof Media.Video) {
			if (!this.History.includes(media)) this.History=[media, ...this.History];
			_(this).m_selectedId=media.Id;
			_(this).m_artifact=null;
		}
		else _(this).m_artifact=media;
		this.NotifyChanged();
		return media;
	};
	_['public'].GetLegacyMedia=async function (media) {
		if (!media) return null;
		return {...media.toJSON(), base64: media.Data?await media.ToBase64():undefined};
	};
	_['public'].ToMedia=function (value) {
		if (!value||value instanceof Media) return value;
		return this.History.find((entry)=>entry.Id===value.id)||Media.From(value);
	};
	_['public'].History=null;
	_['protected'].m_selectedId=null;
	_['protected'].m_artifact=null;
	_['protected'].m_changed=null;
});
