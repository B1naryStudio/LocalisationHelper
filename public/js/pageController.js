var app = app || {};

(function() {

	var self;

	function PageController() {
		this.$el = {
			data            : $('#data'),
			popup           : $('#popup'),
			history         : $('#history'),
			spinner         : $('#spinner'),
			loginForm       : $('#login-form'),
			container       : $('#container'),
			worksheets      : $('#worksheets'),
			spreadsheetKey  : $('#sp-key-value'),
			newLocalisation : $('#localisation-new'),
			locKey          : $('#localisation-key'),
			locProject      : $('#localisation-project'),
			locContext      : $('#localisation-context'),
			locOriginal     : $('#localisation-original'),
			locTranslation  : $('#localisation-translation'),
		};
		this.$templates = {
			worksheetsTemplate      : $('#worksheet-template'),
			translationItemTemplate : $('#translation-item-template'),
			historyTemplate         : $('#history-translation-template')
		};
		
		setTimeout(function() {
			fadeScreen('loginForm');
		}, 400);

		this.showModifiedOnly = false;
		this.showMissedOnly = false;
		this.bindListeners();
		self = this;
	};

	function getAllTranslationItemsByCurrentFilter() {
		var selector = '.translation-item';
		if(self.showModifiedOnly) {
			selector += '.changed';
		}		
		if(self.showMissedOnly) {
			selector += '.missed';
		}
		return self.$el.data.find(selector);
	}

	function hideAllTranslations() {
		self.$el.data.find('.translation-item').hide();
	}

	function fadeScreen(elName) {
		clearFade();
		if(self.$el[elName]) {
			self.$el[elName].toggleClass('visible', true);
		}
		self.$el.popup.toggleClass('visible', true);
	}

	function clearFade() {
		self.$el.popup.toggleClass('visible', false);
		self.$el.popup.find('.visible').toggleClass('visible', false);
	}

	PageController.prototype.showOnlyModified = function() {
		self.showModifiedOnly = $(this).is(':checked');
		hideAllTranslations();
		getAllTranslationItemsByCurrentFilter().show();
	};

	PageController.prototype.showOnlyMissed = function() {
		self.showMissedOnly  = $(this).is(':checked');
		hideAllTranslations();
		getAllTranslationItemsByCurrentFilter().show();		
	};

	PageController.prototype.searchByLanguages = function() {
		var value = $(this).val().toLowerCase();
		var items = self.$el.worksheets.find('.worksheet');
		if(!value) {
			items.show();
			return;
		}
		items.hide();
		items.filter(function(index, item) {
			return $(item).find('.worksheet-name').text().toLowerCase().indexOf(value) > -1 ||
					$(item).find('.worksheet-lang').text().toLowerCase().indexOf(value) > -1;

		}).show();
	};

	PageController.prototype.searchByTranslations = function() {
		var value = $(this).val().toLowerCase();
		hideAllTranslations();
		if(!value) {
			getAllTranslationItemsByCurrentFilter().show();
			return;
		} else {
			var items = getAllTranslationItemsByCurrentFilter();
			items.filter(function(index, item) {
				return $(item).find('.translation-key').text().toLowerCase().indexOf(value) > -1 ||
						$(item).find('.translation-value').text().toLowerCase().indexOf(value) > -1 ||
						$(item).find('.translation-original').text().toLowerCase().indexOf(value) > -1;

			}).show();			
		}
	};

	PageController.prototype.getWorksheetsData = function() {
		fadeScreen('spinner');
		var item = $(this);
		var url = item.find('.worksheet-url').html();
		var container = $('<div>').attr('id', 'translation-content').toggleClass('scrollBarInner', true);
		$('.worksheet.selected').toggleClass('selected', false);
		item.toggleClass('selected', true);
		$.get('/localisation', {url: url}, function(response) {
			if(response.status === 'ok') {
				clearFade();
				var list = response.data;
				list.forEach(function(item) {
					var $translationItem = self.$templates.translationItemTemplate.tmpl(item);
					if(!item.translation) {
						$translationItem.toggleClass('missed', true);
					}
					container.append($translationItem);
				});
				self.$el.data.html(container);
				var shadow = $('<div>').toggleClass('shadow', true);
				container.prepend(shadow);
			} else {
				console.log(response.error);
			}
		});
	};

	PageController.prototype.loadSpreadsheet = function() {
		var key = self.$el.spreadsheetKey.val();
		fadeScreen('spinner');
		$.get('/worksheets', {key: key}, function(response) {
			if(response.status === 'ok') {
				clearFade();
				var list = response.data;
				var container = $('<div>').toggleClass('scrollBarInner', true);
				self.$el.container.show();
				self.$el.worksheets.html('');
				list.forEach(function(item) {
					var $worksheet = self.$templates.worksheetsTemplate.tmpl(item);
					container.append($worksheet);
				});
				self.$el.worksheets.append(container);
			} else {
				console.log(response.error);
			}
		});
	};

	PageController.prototype.closeHistoryPopup = function() {
		clearFade();
		var $oldTranslationContainer = $('.translation-item.selected');
		$oldTranslationContainer.toggleClass('selected', false);
	};

	PageController.prototype.setHistoryItem = function() {
		var newTranslation = $(this).find('.history-translation-value').text();
		var $oldTranslationContainer = $('.translation-item.selected');
		$oldTranslationContainer.toggleClass('selected', false);
		var $textContainer = $oldTranslationContainer.find('.translation-value-text');
		$textContainer.text(newTranslation);
		$textContainer.keyup();
		self.closeHistoryPopup();
	};

	PageController.prototype.getTranslationHistory = function() {
		var container = $(this).closest('.translation-item');
		var item = container.data('item');
		fadeScreen('spinner');
		container.toggleClass('selected', true);
		if(item) {
			$.get('/history', {item: item}, function(response) {
				if(response.status === 'ok') {
					self.$el.history.html('');
					var list = response.data; 
					var html = self.$templates.historyTemplate.tmpl({
						content: list,
						header: 'History for lang: ' + item.lang + ' key: ' + item.key
					});
					self.$el.history.append(html);
					fadeScreen('history');
				} else {
					console.log(response.error);
				}
			});
		}
	};

	PageController.prototype.applyTranslationChanges = function() {
		fadeScreen('spinner');
		var $translationItemContainer = $(this).closest('.translation-item');
		var $textContainer = $translationItemContainer.find('.translation-value-text');
		var data = $translationItemContainer.data('item');
		data.previousTranslation = data.translation;
		data.translation = $textContainer.text();
		$.ajax({
			url: '/localisation',
			type: 'PUT',
			data: {item: data},
			success: function(response) {
				if(response.status === 'ok') {
					$translationItemContainer.toggleClass('changed', false);
					$textContainer.data('default', $textContainer.text());
				} else {
					alert(response.error);
				}
				clearFade();
			},
			error: function(err) {
				alert(err);
				clearFade();
			}
		});
	};

	PageController.prototype.cancelTranslationChanges = function() {
		var $translationItemContainer = $(this).closest('.translation-item');
		var $textContainer = $translationItemContainer.find('.translation-value-text');
		var defaultText = $textContainer.data('default');
		$translationItemContainer.toggleClass('changed', false);
		$textContainer.text(defaultText);	
	};

	PageController.prototype.onTranslationTextChanged = function() {
		var $textContainer = $(this);
		var $translationItemContainer = $textContainer.closest('.translation-item');
		var defaultValue = $textContainer.data('default');
		var isChanged = defaultValue !== $textContainer.text();
		$translationItemContainer.toggleClass('changed', isChanged);
	};

	PageController.prototype.openCreateNewKeyDialog = function() {
		fadeScreen('newLocalisation');
	};

	PageController.prototype.closeNewKeyPopup = function() {
		clearFade();
	};

	PageController.prototype.addNewKey = function() {
		var item = {		
			key : self.$el.locKey.val(),
			project : self.$el.locProject.val(),
			context : self.$el.locContext.val(),
			translation : self.$el.locTranslation.val(),
			originalValue: self.$el.locOriginal.val()
		};
		var key = self.$el.spreadsheetKey.val();
		fadeScreen('spinner');
		$.post('/localisation', {item: item, key: key}, function(response) {
			if(response.status === 'ok') {				
				console.log(JSON.stringify(response));
			} else {
				console.log(response.error);
			}
			clearFade();
		});
	};

	PageController.prototype.applyScrollbar = function(container) {
		container.mCustomScrollbar({
			theme: 'dark-3',
			scrollButtons: { enable: true },
			updateOnContentResize: true,
			advanced: { updateOnSelectorChange: "true" },
			scrollInertia: 0
		});
	};

	PageController.prototype.bindListeners = function() {
		$('#sp-key-ok').click(this.loadSpreadsheet);
		$('#create-new-localisation').click(this.openCreateNewKeyDialog);
		$('#create-zip').click(this.getLocalisationZip);
		$('#localisation-new-cancel').click(this.closeNewKeyPopup);
		$('#localisation-new-ok').click(this.addNewKey);
		$('#localisation-changed-only').click(this.showOnlyModified);
		$('#localisation-missed-only').click(this.showOnlyMissed);
		$('#history').on('click', '.history-translation-item', this.setHistoryItem);
		$('#history').on('click', '#close-button', this.closeHistoryPopup);
		$('#worksheets').on('click', '.worksheet', this.getWorksheetsData);
		$('#language-search').on('keyup', _.debounce(this.searchByLanguages, 200));
		$('#localisation-search').on('keyup', _.debounce(this.searchByTranslations, 200));
		$('#data').on('click', '.translation-history', this.getTranslationHistory);
		$('#data').on('click', '.translation-apply', this.applyTranslationChanges);
		$('#data').on('click', '.translation-cancel', this.cancelTranslationChanges);
		$('#data').on('keyup', '.translation-value-text', this.onTranslationTextChanged);
		$('#data').on('click', '.translation-item', function() {
			$(this).find('.translation-value > span').focus();
		});	
	};

	app.PageController = PageController;
})();