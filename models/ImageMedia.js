var ImageMedia=Function.extend(Media, function () {
	var _=this(ImageMedia);
	ImageMedia=_[ImageMedia];
	function ImageMedia(value={}) {
		_['base'].apply(this, arguments);
		this.Width=value.width||null;
		this.Height=value.height||null;
	}
	_['public'].Width=null;
	_['public'].Height=null;
	_['public'].toJSON=function () {
		return {id: this.Id, mimeType: this.MimeType, title: this.Title, mediaId: this.MediaId, width: this.Width, height: this.Height};
	};
});
Media.Image=ImageMedia;
