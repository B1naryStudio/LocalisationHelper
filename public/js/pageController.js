var app = app || {};

(function() {

	var self;

	function PageController() {
		self = this;
		this.$el = {
			diff            : $('#diff'),
			data            : $('#data'),
			popup           : $('#popup'),
			history         : $('#history'),
			dateTo          : $('#date-to'),
			spinner         : $('#spinner'),
			dateFrom        : $('#date-from'),
			container       : $('#container'),
			worksheets      : $('#worksheets'),
			diffContent     : $('#diff-content'),
			spreadsheetKey  : $('#sp-key-value'),
			newLocalisation : $('#localisation-new'),
			spreadsheetForm : $('#spreadsheet-form'),
			consistencyForm : $('#consistency-form'),
			locKey          : $('#localisation-key'),
			consContent     : $('#consistency-content'),
			leftMenu        : $('#left-button-section'),
			locProject      : $('#localisation-project'),
			locContext      : $('#localisation-context'),
			locOriginal     : $('#localisation-original'),
			tranformTooltip : $('#text-tranformations-tooltip')
		};
		this.$templates = {
			diffTemplate            : $('#diff-template'),
			worksheetsTemplate      : $('#worksheet-template'),
			consistencyTemplate     : $('#consistency-template'),
			translationItemTemplate : $('#translation-item-template'),
			historyTemplate         : $('#history-translation-template'),
			existedLocsTemplate     : $('#existed-localisations-template')
		};
		
		this.showModifiedOnly = false;
		this.showMissedOnly = false;
		this.bindListeners();
		this.loadSpreadsheet();
		this.currentData = [];		
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
		self.$el.popup.toggleClass('visible', true);
		if(elName !== 'spinner') {
			setTimeout(function() {
				if(self.$el[elName]) {
					self.$el[elName].toggleClass('visible', true);
				}
			}, 100);
		} else {
			self.$el.spinner.toggleClass('visible', true);
		}
	}

	function clearFade() {
		self.$el.popup.find('.visible').toggleClass('visible', false);
		self.$el.popup.toggleClass('visible', false);
	}

	function updateCurrentWorksheet() {
		$('.worksheet.selected').click();
	}

	function applyFilters() {
		hideAllTranslations();
		getAllTranslationItemsByCurrentFilter().show();			
	}

	function toTitleCase(str)
	{
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}

	function calculateModifiedCount() {
		$('#modified-counter').remove();
		var count = $('.translation-item.changed').length;
		if(count) {
			var counter = $('<div id="modified-counter">Modified ' + count + ' item(s)</div>');
			self.$el.data.append(counter);
		}
	}
	var alertUserAboutLimit = _.throttle(function (limit) {
		alertify.error("Maximum translation length for this key is: " + limit);
	}, 5000);

	PageController.prototype.showOnlyModified = function() {
		self.showModifiedOnly = $(this).is(':checked');
		applyFilters();
	};

	PageController.prototype.showOnlyMissed = function() {
		self.showMissedOnly  = $(this).is(':checked');
		applyFilters();		
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
		var limitRegexp = /\[(\d+)\]/;
		var url = item.find('.worksheet-url').html();
		var container = $('<div>').attr('id', 'translation-content').toggleClass('scrollBarInner', true);
		$('.worksheet.selected').toggleClass('selected', false);
		item.toggleClass('selected', true);
		$.get('/localisation', {url: url}, function(response) {
			if(response.status === 'ok') {
				clearFade();
				var helpMessageAdded = false;
				alertify.success("Loaded " + item.html());
				self.currentData = response.data;
				self.currentData.forEach(function(item) {
					if(limitRegexp.test(item.context)) {
						var parsedContext = limitRegexp.exec(item.context);
						item.limit = parsedContext[1];
						item.context = item.context.replace(parsedContext[0], '');
					}
					var $translationItem = self.$templates.translationItemTemplate.tmpl(item);
					if(!item.translation) {
						$translationItem.toggleClass('missed', true);
					}
					if(!helpMessageAdded) {
						var original = $translationItem.find('.translation-original');
						var project = $translationItem.find('.translation-project');
						var key = $translationItem.find('.translation-key');
						var context = $translationItem.find('.translation-context');
						var value = $translationItem.find('.translation-value');
						$translationItem.attr('data-step', 3);
						$translationItem.attr('data-intro', 'This is translation item. It consist of several components.'); 
						original.attr('data-step', 4);
						original.attr('data-intro', 'Original english value (which have to be translated)');
						project.attr('data-step', 5);
						project.attr('data-intro', 'Application name (relevant only for Devs)');
						key.attr('data-step', 6);
						key.attr('data-intro', 'Localisation key (relevant only for Devs)');						
						value.attr('data-step', 7);
						value.attr('data-intro', 'Translation for this key for current language. You can edit it');
						context.attr('data-step', 8);
						context.attr('data-intro', 'Context where this translation is used (can be empty)');
						helpMessageAdded = true;
					}
					container.append($translationItem);
				});
				self.$el.data.html(container);
				var shadow = $('<div>').toggleClass('shadow', true);
				container.prepend(shadow);
			} else {
				alertify.error(response.error);
				console.log(response.error);
			}
		});
	};

	PageController.prototype.loadSpreadsheet = function() {
		var key = self.$el.spreadsheetKey.val();
		self.$el.leftMenu.show();
		fadeScreen('spinner');
		$.get('/worksheets', {key: key}, function(response) {
			if(response.status === 'ok') {
				clearFade();
				alertify.success("Spreadsheet loaded");
				var list = response.data;
				var container = $('<div>').toggleClass('scrollBarInner', true);
				self.$el.container.show();
				self.$el.worksheets.html('');
				list.forEach(function(item) {
					var $worksheet = self.$templates.worksheetsTemplate.tmpl(item);
					container.append($worksheet);
				});
				self.$el.worksheets.append(container);
				$('.worksheet:first').click();
			} else {
				alertify.error(response.error);
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
					alertify.error(response.error);
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
					data.editLink = response.data.editLink;
					$translationItemContainer.data('item', data);
					$translationItemContainer.toggleClass('changed', false);
					$translationItemContainer.toggleClass('missed', data.translation === '');
					$textContainer.data('default', $textContainer.text());
					applyFilters();
					alertify.success("Changes has been applied");
				} else {
					alertify.error(response.error);
					console.log(response.error);
				}
				clearFade();
				calculateModifiedCount();
			},
			error: function(err) {
				alertify.error(err);
				console.log(err);
				clearFade();
				calculateModifiedCount();
			}
		});
	};

	PageController.prototype.applyAllTranslationChanges = function() {
		fadeScreen('spinner');
		var changedItems = $('.translation-item.changed');
		var items = _.map(changedItems, function(it) {
			it = $(it);
			var $textContainer = it.find('.translation-value-text');
			var data = it.data('item');
			data.previousTranslation = data.translation;
			data.translation = $textContainer.text();
			return data;
		});
		$.ajax({
			url: '/localisation/multi',
			type: 'POST',
			contentType: 'application/json',
			data: JSON.stringify({items: items}),
			success: function(response) {
				if(response.status === 'ok') {					
					alertify.success("Changes has been applied");
				} else {
					alertify.error(response.error);
					console.log(response.error);
				}
				clearFade();
				updateCurrentWorksheet();
			},
			error: function(err) {
				alertify.error(err);
				console.log(err);
				clearFade();
				updateCurrentWorksheet();
			}
		});
	};

	PageController.prototype.cancelTranslationChanges = function() {
		var $translationItemContainer = $(this).closest('.translation-item');
		var $textContainer = $translationItemContainer.find('.translation-value-text');
		var defaultText = $textContainer.data('default');
		$translationItemContainer.toggleClass('changed', false);
		$textContainer.text(defaultText);
		alertify.log("Canceled changes");
		calculateModifiedCount();
	};

	PageController.prototype.onTranslationTextChanged = function() {
		var $textContainer = $(this);
		var $translationItemContainer = $textContainer.closest('.translation-item');
		var defaultValue = $textContainer.data('default');
		var limit = $translationItemContainer.data('item').limit;
		if(limit) {
			alertUserAboutLimit(limit);
			$textContainer.text($textContainer.text().substr(0, limit));
			$textContainer.focusEnd();
		}
		var isChanged = defaultValue !== $textContainer.text();
		$translationItemContainer.toggleClass('changed', isChanged);
		calculateModifiedCount();
	};

	PageController.prototype.openCreateNewKeyDialog = function() {
		self.$el.locKey.val('');
		self.$el.locProject.val('CSB');
		self.$el.locContext.val('');
		self.$el.locOriginal.val('');
		if(!self.currentData.length) {
			alertify.log("Please load any language before add new key");
		} else {
			fadeScreen('newLocalisation');
		}
	};

	PageController.prototype.addNewKey = function() {
		var item = {		
			key : self.$el.locKey.val(),
			project : self.$el.locProject.val(),
			context : self.$el.locContext.val(),
			originalValue: self.$el.locOriginal.val()
		};
		var existedKeys = _.filter(self.currentData, function(it) {
			return it.project === item.project && 
				(it.key === item.key || it.originalValue === item.originalValue);
		});
		function sendNewKey() {
			fadeScreen('spinner');
			$.post('/localisation', {item: item}, function(response) {
				if(response.status === 'ok') {
					alertify.success("Key has been successfully added");
					console.log(JSON.stringify(response));				
				} else {
					alertify.error(response.error);
					console.log(response.error);
				}
				clearFade();
				updateCurrentWorksheet();
			});
		}
		if(existedKeys.length) {
			var data = {
				message: 'Seems the key you are trying to add already exist. Do you want to proceed?',
				existedLocs: existedKeys.map(function(it) {
					return [it.key, it.originalValue, it.translation].join(' ');
				})
			};
			var messageTmpl = self.$templates.existedLocsTemplate.tmpl(data);
			alertify.confirm(messageTmpl.html(), function (e) {
				if(e) {
					sendNewKey();
				} else {
					clearFade();
				}
			});
		} else {
			sendNewKey();
		}
	};

	PageController.prototype.deleteTranslationKey = function() {
		var container = $(this).closest('.translation-item');
		var item = container.data('item');
		alertify.confirm('Do you really want to delete ' + item.key + ' key?', function (e) {
			if (e) {
				// user clicked "ok"
				fadeScreen('spinner');
				if(item) {
					$.ajax({
						url: '/localisation',
						type: 'DELETE',
						data: {item: item},
						success: function(response) {
							if(response.status === 'ok') {
								updateCurrentWorksheet();
								alertify.success("Key has been successfully removed");
							} else {
								alertify.error(response.error);
								console.log(response.error);
								clearFade();
							}					
						},
						error: function(err) {
							alertify.error(err);
							console.log(err);
							clearFade();
						}
					});
				}
			} else {
				// user clicked "cancel"
				clearFade();
			}
		});
	};

	PageController.prototype.getLocalisationDiff = function() {
		var from = self.$el.dateFrom.val();
		var to = self.$el.dateTo.val();
		$.getJSON('/diff', {from: from, to: to}, function(response) {
			if(response.status === 'ok') {
				var data = response.data;
				var update = _.groupBy(_.where(data, {type: 'update'}), function(item) {
					return item.lang;
				});
				var add = _.groupBy(_.where(data, {type: 'add'}), function(item) {
					return item.project;
				});
				var remove = _.groupBy(_.where(data, {type: 'delete'}), function(item) {
					return item.project;
				});
				data = {
					update: update,
					add: add,
					remove: remove
				};

				var template = self.$templates.diffTemplate;
				self.$el.diffContent.html(template.tmpl(data));
			} else {
				self.$el.diffContent.html(response.error);
			}
		});		
	};

	PageController.prototype.checkConsistency = function() {
		fadeScreen('spinner');
		$.getJSON('/consistency', function(response) {
			if(response.status === 'ok') {
				self.$el.consContent.html('');
				fadeScreen('consistencyForm');
				if(_.isEmpty(response.data)) {
					self.$el.consContent.html('No errors were found. Spreadsheet looks consistent.');
				} else {
					var template = self.$templates.consistencyTemplate;
					self.$el.consContent.html(template.tmpl({data: response.data}));
				}
			} else {
				self.$el.consContent.html(response.error);
			}
		});
	};

	PageController.prototype.runIntro = function() {
		introJs().start();
	};

	PageController.prototype.convertToUpper = function() {
		if(!self.currentData.length) {
			return alertify.log("Please load any language before test transformation");
		}

		$('.translation-value-text').each(function(index, item) {
			item = $(item);
			var text = item.text().toUpperCase();
			item.text(text);
			PageController.prototype.onTranslationTextChanged.call(item);
		});
	};
	PageController.prototype.convertToLower = function() {
		if(!self.currentData.length) {
			return alertify.log("Please load any language before test transformation");
		}

		$('.translation-value-text').each(function(index, item) {
			item = $(item);
			var text = item.text().toLowerCase();
			item.text(text);
			PageController.prototype.onTranslationTextChanged.call(item);
		});
	};
	PageController.prototype.convertToCamel = function() {
		if(!self.currentData.length) {
			return alertify.log("Please load any language before test transformation");
		}

		$('.translation-value-text').each(function(index, item) {
			item = $(item);
			var text = toTitleCase(item.text());
			item.text(text);
			PageController.prototype.onTranslationTextChanged.call(item);
		});
	};

	PageController.prototype.bindListeners = function() {
		$('#request-diff').click(this.getLocalisationDiff);
		$('#intro').click(this.runIntro);
		$('#apply-all-button').click(this.applyAllTranslationChanges);
		$('#create-new-localisation').click(this.openCreateNewKeyDialog);
		$('#localisation-new-ok').click(this.addNewKey);
		$('#localisation-changed-only').click(this.showOnlyModified);
		$('#localisation-missed-only').click(this.showOnlyMissed);
		$('#check-consistency').click(this.checkConsistency);
		$('#history').on('click', '.history-translation-item', this.setHistoryItem);
		$('#history').on('click', '#close-button', this.closeHistoryPopup);
		$('#worksheets').on('click', '.worksheet', this.getWorksheetsData);
		$('#language-search').on('keyup', _.debounce(this.searchByLanguages, 200));
		$('#localisation-search').on('keyup', _.debounce(this.searchByTranslations, 200));
		$('#data').on('click', '.translation-history', this.getTranslationHistory);
		$('#data').on('click', '.translation-delete', this.deleteTranslationKey);
		$('#data').on('click', '.translation-apply', this.applyTranslationChanges);
		$('#data').on('click', '.translation-cancel', this.cancelTranslationChanges);
		$('#data').on('keyup', '.translation-value-text', this.onTranslationTextChanged);
		$('#data').on('click', '.translation-item', function() {
			$(this).find('.translation-value > span').focus();
		});
		$('#change-spreadsheet').click(function() {
			fadeScreen('spreadsheetForm');
		});
		$('#get-diff').click(function() {
			fadeScreen('diff');
			self.$el.diffContent.html('');
		});
		$('#text-tranformations').mouseover(function() {
			self.$el.tranformTooltip.fadeIn();
		});
		$('#text-tranformations').mouseleave(function() {
			self.$el.tranformTooltip.fadeOut();
		});
		$('#text-tranformations-upper').click(this.convertToUpper);
		$('#text-tranformations-lower').click(this.convertToLower);
		$('#text-tranformations-camel').click(this.convertToCamel);
		$('.close-button').click(function() {
			clearFade();
		});
		$('#date-from, #date-to').pikaday({
			firstDay: 1,
			minDate: new Date('2000-01-01'),
			maxDate: new Date('2020-12-31'),
			defaultDate: new Date(),
			setDefaultDate : new Date(),
			yearRange: [2000,2020],
			format: 'YYYY-MM-DD',
		});
	};

	app.PageController = PageController;
})();