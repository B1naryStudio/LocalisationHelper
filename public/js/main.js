$(document).ready(function() {
	var worksheetsTemplate = $('#worksheet-template');
	var translationItemTemplate = $('#translation-item-template');
	var $data = $('#data');
	var $worksheets = $('#worksheets');
	var $worksheets = $('#worksheets');
	var $loginForm = $('#login-form');
	var $spinner = $('#spinner');
	var $popup = $('#popup');
	var $container = $('#container');
	setTimeout(function(){
		$loginForm.toggleClass('visible', true);
	}, 400);
	$('#localisation-changed-only').click(function() {
		var value = $(this).is(':checked');
		var items = $data.find('.translation-item');
		if(!value) {
			items.fadeIn();
		} else {
			items.hide();
			$data.find('.translation-item.changed').fadeIn();
		}
	});
	$('#language-search').on('keyup', _.debounce(function() {
		var value = $(this).val();
		var items = $worksheets.find('.worksheet');
		if(!value) {
			items.show();
			return;
		}
		items.hide();
		items.filter(function(index, item) {
			return $(item).find('.worksheet-name').text().indexOf(value) > -1 ||
					$(item).find('.worksheet-lang').text().indexOf(value) > -1;

		}).fadeIn();
	}, 200));
	$('#localisation-search').on('keyup', _.debounce(function() {
		var value = $(this).val();
		var items = $data.find('.translation-item');
		if(!value) {
			items.show();
			return;
		}
		items.hide();
		items.filter(function(index, item) {
			return $(item).find('.translation-key').text().indexOf(value) > -1 ||
					$(item).find('.translation-value').text().indexOf(value) > -1 ||
					$(item).find('.translation-original').text().indexOf(value) > -1;

		}).fadeIn();			
	}, 200));
	$('#worksheets').on('click', '.worksheet', function() {
		var item = $(this);
		var url = item.find('.worksheet-url').html();
		var container = $('<div>').attr('id', 'translation-content');
		$popup.toggleClass('visible', true);
		$.get('/worksheet', {url: url}, function(result) {
			$popup.toggleClass('visible', false);
			result.forEach(function(item) {
				var translationItem = translationItemTemplate.tmpl(item);
				container.append(translationItem);
			});
			$data.html(container);
			container.mCustomScrollbar({
				theme: 'dark-3',
				scrollButtons: { enable: true },
				updateOnContentResize: true,
				advanced: { updateOnSelectorChange: "true" },
				scrollInertia: 0
			});
		});
	});
	$('#sp-key-ok').click(function() {
		var key = $('#sp-key-value').val();
		$spinner.toggleClass('visible', true);
		$loginForm.toggleClass('visible', false);
		$.get('/worksheets', {key: key}, function(list) {
			$popup.toggleClass('visible', false);
			$container.show();
			$worksheets.html('');
			list.forEach(function(item) {
				var $worksheet = worksheetsTemplate.tmpl(item);
				$worksheets.append($worksheet);
				$worksheet.fadeIn();
			});
			$('#worksheets').mCustomScrollbar({
				theme: 'dark-3',
				scrollButtons: { enable: true },
				updateOnContentResize: true,
				advanced: { updateOnSelectorChange: "true" },
				scrollInertia: 0
			});
		});
	});
	$('#data').on('click', '.translation-history', function() {
		var item = $(this).closest('.translation-item').data('item');
		if(item) {
			$.get('/history', {item: item}, function(list) {
				console.log(list);
			});
		}
	});
	$('#data').on('click', '.translation-apply', function() {
		var $translationItemContainer = $(this).closest('.translation-item');
		var $textContainer = $translationItemContainer.find('.translation-value-text');
		// send update request
	});
	$('#data').on('click', '.translation-cancel', function() {
		var $translationItemContainer = $(this).closest('.translation-item');
		var $textContainer = $translationItemContainer.find('.translation-value-text');
		var defaultText = $textContainer.data('default');
		$translationItemContainer.toggleClass('changed', false);
		$textContainer.text(defaultText);
	});
	$('#data').on('keyup', '.translation-value-text', function() {
		var $textContainer = $(this);
		var $translationItemContainer = $textContainer.closest('.translation-item');
		var defaultValue = $textContainer.data('default');
		var isChanged = defaultValue !== $textContainer.text();
		$translationItemContainer.toggleClass('changed', isChanged);
	});
	$('#data').on('click', '.translation-item', function() {
		$(this).find('.translation-value > span').focus();
	});
});