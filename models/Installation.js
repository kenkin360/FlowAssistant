var Installation=Function.extend(Object, function () {
	var _=this(Installation);
	Installation=_[Installation];
	function Installation(name, previousGlobal, previousModule, previousSource) {
		_['base'].apply(this, arguments);
		this.Name=name;
		this.PreviousGlobal=previousGlobal;
		this.PreviousModule=previousModule;
		this.PreviousSource=previousSource;
	}
	_['public'].Name=null;
	_['public'].PreviousGlobal=null;
	_['public'].PreviousModule=null;
	_['public'].PreviousSource=null;
});
