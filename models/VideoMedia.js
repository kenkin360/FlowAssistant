var VideoMedia=Function.extend(Media, function () {
	var _=this(VideoMedia);
	VideoMedia=_[VideoMedia];
	function VideoMedia(value={}) {
		_['base'].apply(this, arguments);
		this.DurationSeconds=value.durationSeconds||null;
		this.Resolution=value.resolution||null;
	}
	_['public'].DurationSeconds=null;
	_['public'].Resolution=null;
	_['public'].toJSON=function () {
		return {id: this.Id, mimeType: this.MimeType, title: this.Title, mediaId: this.MediaId, durationSeconds: this.DurationSeconds, resolution: this.Resolution};
	};
});
Media.Video=VideoMedia;
