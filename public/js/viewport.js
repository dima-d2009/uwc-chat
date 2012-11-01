(function ($) {
  /**
   * Create click indicator
   */
  $('<div id="dm-click"><div id="dm-click-1"></div></div>').appendTo($('body'));
  
  
  /**
   * Indicate mouse click visually
   * @param data Object
   */
  function show_click(data) {
    var div_click = $('#dm-click'),
        div_circle_1,
        div_circle_2;
    
    div_circle = div_click.find('> div');
    
    div_click.css({
      'left': data.x + 'px',
      'top': data.y + 'px',
      'display': 'block'
    });
    
    div_circle.stop().css({
      'width': 0,
      'height': 0,
      'opacity': 1,
      'left': 0,
      'top': 0
    }).animate({
      'left': '-20px',
      'top': '-20px',
      'width': '40px',
      'height': '40px',
      'opacity': 0
    }, {
      'duration': 800,
      'complete': function() {
        div_click.css('display', 'none');
      }
    });
  }
  
  
  /**
   * FOR SUPPORT
   */
  if (DM_CHAT_GLOBALS.app == 'support') {
    /**
     * Viewport click
     */
    $('#viewport-cover, #dm-click').on('click', function(e) {
      var viewport = $('#viewport'),
          win = $(window);
      
      dm_socket.emit('message', {
        type: 'support_click',
        x: e.pageX - viewport.offset().left,
        y: e.pageY - viewport.offset().top
      });
      
      show_click({
        x: e.pageX - win.scrollLeft(),
        y: e.pageY - win.scrollTop()
      });
    });
    
    
    /**
     * Viewport data
     */
    dm_socket.on('message', function(message) {
      if (message.type == 'viewport_data') {
        if (message.action == 'scroll') {
          $('#viewport').stop().animate({
            'scrollTop': message.top + 'px',
            'scrollLeft': message.left + 'px'
          }, {
            'duration': 300
          });
        } else {
          var viewport_css = {
            'width': message.width + 'px',
            'height': message.height + 'px'
          };
          
          $('#viewport-container').animate(viewport_css, {
            'duration': 300,
            'complete': function() {
              $('#viewport').css(viewport_css).stop().animate({
                'scrollTop': message.scrollTop + 'px',
                'scrollLeft': message.scrollLeft + 'px'
              }, {
                'duration': 300
              });;
            }
          });
          
          $('#viewport-ajax-loader').fadeOut(600);
        }
      }
    });
    
    
    /**
     * Request client's viewport dimensions, when support accepts notification
     */
    $('body').on('dmChatAcceptNotification', function() {
      dm_socket.emit('message', { type: 'viewport_data', action: 'refresh' });
    });
  }
  
  
  /**
   * FOR CLIENT
   */
  if (DM_CHAT_GLOBALS.app == 'client') {
    /**
     * Viewport click
     */
    dm_socket.on('message', function(message) {
      if (message.type == 'support_click') {
        // Visualize the support's click
        show_click(message);
      } else if (message.type == 'viewport_data') {
        // Send viewport size to support
        if (message.action == 'refresh') {
          send_viewport_data();
        }
      }
    });
    
    
    /**
     * Viewport data
     */
    var send_viewport_data = function() {
      var win = $(window);
      
      dm_socket.emit('message', {
        type: 'viewport_data',
        action: 'data',
        width: win.width(),
        height: win.height(),
        scrollTop: win.scrollTop(),
        scrollLeft: win.scrollLeft()
      });
    };
    
    
    /**
     * Send scroll position to support
     */
    var scroll_timeout = null;
    
    $(window).scroll(function() {
      var win = $(window);
      
      if (scroll_timeout !== null) {
        clearTimeout(scroll_timeout);
        scroll_timeout = null;
      }
      
      scroll_timeout = setTimeout(function() {
        dm_socket.emit('message', {
          type: 'viewport_data',
          action: 'scroll',
          top: win.scrollTop(),
          left: win.scrollLeft()
        });
      }, 200);
    });

    
    /**
     * Document ready
     */
    $(document).ready(function() {
      /**
       * Send viewport size to support on window resize
       */
      var resize_timeout = null;
      
      $(window).on('resize', function() {
        if (resize_timeout !== null) {
          clearTimeout(resize_timeout);
          resize_timeout = null;
        }
        
        resize_timeout = setTimeout(send_viewport_data, 200);
      });
    });
  }
  
}(jQuery));