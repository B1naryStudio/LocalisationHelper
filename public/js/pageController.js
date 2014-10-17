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
			historyItems    : $('#history-items'),
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
			historyItemTemplate     : $('#history-translation-item-template')
		};
		
		setTimeout(function() {
			self.$el.loginForm.toggleClass('visible', true);
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

	function showAllTranslations() {
		self.$el.data.find('.translation-item').show();
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
		var item = $(this);
		var url = item.find('.worksheet-url').html();
		var container = $('<div>').attr('id', 'translation-content');
		self.$el.popup.toggleClass('visible', true);
		$.get('/localisation', {url: url}, function(response) {
			if(response.status === 'ok') {
				var list = response.data;
				self.$el.popup.toggleClass('visible', false);
				list.forEach(function(item) {
					var $translationItem = self.$templates.translationItemTemplate.tmpl(item);
					if(!item.translation) {
						$translationItem.toggleClass('missed', true);
					}
					container.append($translationItem);
				});
				self.$el.data.html(container);
				// self.applyScrollbar(container);
			} else {
				console.log(response.error);
			}
		});
	};

	PageController.prototype.loadSpreadsheet = function() {
		var key = self.$el.spreadsheetKey.val();
		self.$el.spinner.toggleClass('visible', true);
		self.$el.loginForm.toggleClass('visible', false);
		$.get('/worksheets', {key: key}, function(response) {
			if(response.status === 'ok') {
				var list = response.data;
				self.$el.popup.toggleClass('visible', false);
				self.$el.container.show();
				self.$el.worksheets.html('');
				list.forEach(function(item) {
					var $worksheet = self.$templates.worksheetsTemplate.tmpl(item);
					self.$el.worksheets.append($worksheet);
					$worksheet.fadeIn();
				});
				self.applyScrollbar(self.$el.worksheets);
			} else {
				console.log(response.error);
			}
		});
	};

	PageController.prototype.closeHistoryPopup = function() {
		self.$el.popup.toggleClass('visible', false);
		self.$el.history.toggleClass('visible', false);
		self.$el.historyItems.mCustomScrollbar("destroy");
		self.$el.historyItems.html('');
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
		self.$el.popup.toggleClass('visible', true);
		container.toggleClass('selected', true);
		if(item) {
			$.get('/history', {item: item}, function(response) {
				if(response.status === 'ok') {
					var list = response.data; 
					var header = $('<div>').text('History for lang: ' + item.lang + ' key: ' + item.key);
					self.$el.historyItems.append(header);
					list.forEach(function(item) {
						var $historyItem = self.$templates.historyItemTemplate.tmpl(item);
						self.$el.historyItems.append($historyItem);
					});
					self.applyScrollbar(self.$el.historyItems);
					self.$el.history.toggleClass('visible', true);
				} else {
					console.log(response.error);
				}
			});
		}
	};

	PageController.prototype.applyTranslationChanges = function() {
		var $translationItemContainer = $(this).closest('.translation-item');
		var $textContainer = $translationItemContainer.find('.translation-value-text');
		var initialData = $translationItemContainer.data('item');
		initialData.translation = $textContainer.text();
		$.ajax({
			url: '/localisation',
			type: 'PUT',
			data: {item: initialData},
			success: function(response) {
				if(response.status === 'ok') {
					$translationItemContainer.toggleClass('changed', false);
					$textContainer.data('default', $textContainer.text());
				} else {
					alert(response.error);
				}
			},
			error: function(err) {
				alert(err);
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
		self.$el.popup.toggleClass('visible', true);
		self.$el.newLocalisation.toggleClass('visible', true);
	};

	PageController.prototype.closeNewKeyPopup = function() {
		self.$el.popup.toggleClass('visible', false);
		self.$el.newLocalisation.toggleClass('visible', false);
	};

	PageController.prototype.getLocalisationZip = function() {
		//
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
		self.$el.popup.toggleClass('visible', true);
		$.post('/localisation', {item: item, key: key}, function(response) {
			if(response.status === 'ok') {
				self.$el.popup.toggleClass('visible', false);
				self.$el.newLocalisation.toggleClass('visible', false);
				console.log(JSON.stringify(response));
			} else {
				console.log(response.error);
			}			
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
		$('#close-button').click(this.closeHistoryPopup);
		$('#create-new-localisation').click(this.openCreateNewKeyDialog);
		$('#create-zip').click(this.getLocalisationZip);
		$('#localisation-new-cancel').click(this.closeNewKeyPopup);
		$('#localisation-new-ok').click(this.addNewKey);
		$('#localisation-changed-only').click(this.showOnlyModified);
		$('#localisation-missed-only').click(this.showOnlyMissed);
		$('#worksheets').on('click', '.worksheet', this.getWorksheetsData);
		$('#history-items').on('click', '.history-translation-item', this.setHistoryItem);
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