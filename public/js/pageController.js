var app = app || {};

(function() {

	var self;

	function PageController() {
		this.$el = {
			container    : $('#container'),
			data         : $('#data'),
			worksheets   : $('#worksheets'),
			loginForm    : $('#login-form'),
			spinner      : $('#spinner'),
			popup        : $('#popup'),
			history      : $('#history'),
			historyItems : $('#history-items')
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
		this.bindListeners();
		self = this;
	};

	PageController.prototype.showOnlyModified = function() {
		var value = $(this).is(':checked');
		var items = self.$el.data.find('.translation-item');
		if(!value) {
			items.fadeIn();
			self.showModifiedOnly = false;
		} else {
			items.hide();
			self.$el.data.find('.translation-item.changed').fadeIn();
			self.showModifiedOnly = true;
		}
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

		}).fadeIn();
	};

	PageController.prototype.searchByTranslations = function() {
		var value = $(this).val().toLowerCase();
		var items;
		if(self.showModifiedOnly) {
			items = self.$el.data.find('.translation-item.changed');
		} else {
			items = self.$el.data.find('.translation-item');
		}
		if(!value) {
			items.show();
			return;
		}
		items.hide();
		items.filter(function(index, item) {
			return $(item).find('.translation-key').text().toLowerCase().indexOf(value) > -1 ||
					$(item).find('.translation-value').text().toLowerCase().indexOf(value) > -1 ||
					$(item).find('.translation-original').text().toLowerCase().indexOf(value) > -1;

		}).fadeIn();			
	};

	PageController.prototype.getWorksheetsData = function() {
		var item = $(this);
		var url = item.find('.worksheet-url').html();
		var container = $('<div>').attr('id', 'translation-content');
		self.$el.popup.toggleClass('visible', true);
		$.get('/worksheet', {url: url}, function(result) {
			self.$el.popup.toggleClass('visible', false);
			result.forEach(function(item) {
				var translationItem = self.$templates.translationItemTemplate.tmpl(item);
				container.append(translationItem);
			});
			self.$el.data.html(container);
			self.applyScrollbar(container);
		});
	};

	PageController.prototype.loadSpreadsheet = function() {
		var key = $('#sp-key-value').val();
		self.$el.spinner.toggleClass('visible', true);
		self.$el.loginForm.toggleClass('visible', false);
		$.get('/worksheets', {key: key}, function(list) {
			self.$el.popup.toggleClass('visible', false);
			self.$el.container.show();
			self.$el.worksheets.html('');
			list.forEach(function(item) {
				var $worksheet = self.$templates.worksheetsTemplate.tmpl(item);
				self.$el.worksheets.append($worksheet);
				$worksheet.fadeIn();
			});
			self.applyScrollbar(self.$el.worksheets);
		});
	};

	PageController.prototype.closeHistoryPopup = function() {
		self.$el.popup.toggleClass('visible', false);
		self.$el.history.toggleClass('visible', false);
		self.$el.historyItems.html('');
		self.$el.historyItems.removeAttr('class');
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
			$.get('/history', {item: item}, function(list) {
				var header = $('<div>').text('History for lang: ' + item.lang + ' key: ' + item.key);
				self.$el.historyItems.append(header);
				list.forEach(function(item) {
					var $historyItem = self.$templates.historyItemTemplate.tmpl(item);
					self.$el.historyItems.append($historyItem);
				});
				self.applyScrollbar(self.$el.historyItems);
				self.$el.history.toggleClass('visible', true);
			});
		}
	};

	PageController.prototype.applyTranslationChanges = function() {
		var $translationItemContainer = $(this).closest('.translation-item');
		var $textContainer = $translationItemContainer.find('.translation-value-text');
		var initialData = $translationItemContainer.data('item');
		initialData.translation = $textContainer.text();
		$.post('/update', {item: initialData}, function(response) {
			if(response.result === 'ok') {
				$translationItemContainer.toggleClass('changed', false);
			} else {
				alert(response);
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
		$('#localisation-changed-only').click(this.showOnlyModified);
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