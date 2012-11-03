(function ($) {
  /**
   * Setup
   */
  var div_chat = $('<div class="dm-chat"></div>').html($('#tmpl-dm-chat').html());
  var a_chat_open = $('<a id="dm-chat-open" href="#" title="' + DM_CHAT_GLOBALS.t.chatOpen + '">&nbsp;</a>').appendTo('body');
  var enable_chat_open = (DM_CHAT_GLOBALS.app == 'support') ? false : true;
  var ul_notifications = $('<ul class="dm-chat-notifications"></ul>').appendTo('body');
  
  
  if (!enable_chat_open) {
    a_chat_open.css({
      'opacity': '.5',
      'cursor': 'default'
    });
  }
  
  
  /**
   * Message model
   */
  var Message = Backbone.Model.extend({});
  
  
  /**
   * Messages collection
   */
  var Messages = Backbone.Collection.extend({
    model: Message
  });
  
  
  /**
   * Message view
   */
  var MessageView = Backbone.View.extend({
    tagName: 'li',
    template: $('#tmpl-dm-chat-message').html(),
    
    render: function() {
      var tmpl = _.template(this.template),
          date = new Date(this.model.get('time')),
          hours = date.getHours(),
          minutes = date.getMinutes();
      
      if (hours < 10) { hours = '0' + hours; }
      if (minutes < 10) { minutes = '0' + minutes; }
      
      this.model.set('time', hours + ':' + minutes);
      
      this.model.set('body', this.model.get('body').replace(/(\r)?\n/g, '<br>'));
      
      this.$el.html(tmpl(this.model.toJSON()));
      
      return this;
    }
  });
  
  
  /**
   * Messages view
   */
  var MessagesView = Backbone.View.extend({
    el: $('.dm-chat-messages > ul', div_chat),
    newMessagesNum: 0,
    
    /**
     * Initialize view
     */
    initialize: function() {
      if (DM_CHAT_GLOBALS.app == 'client') {
        // Set initial message for client
        var messages_list = [
          { time: new Date, me: 'support', body: DM_CHAT_GLOBALS.t.initialMessageClient }
        ];
        this.collection = new Messages(messages_list);
        this.render();
      } else {
        this.collection = new Messages();
      }
    },
    
    /**
     * Render messages
     */
    render: function() {
      var that = this;
      _.each(this.collection.models, function(message) {
        var message_view = new MessageView({
          model: message
        });
        that.$el.append(message_view.render().el);
      });
    },
    
    /**
     * Add message
     * @param message Message data object
     */
    addMessage: function(message) {
      var message_model = new Message(message),
          message_view;
      
      this.collection.add(message_model);
      
      message_view = new MessageView({
        model: message_model
      });
      
      this.$el.append(message_view.render().el);
      this.$el.parent().scrollTop(this.$el.parent()[0].scrollHeight);
      this.newMessagesNum += 1;
    },
    
    
    /**
     * Get number of messages in this session
     */
    getNewMessagesNum: function() {
      return this.newMessagesNum;
    }
    
  });
  
  
  /**
   * Notification model
   */
  var Notification = Backbone.Model.extend({});
  
  
  /**
   * Notification view
   */
  var NotificationView = Backbone.View.extend({
    tagName: 'div',
    className: 'dm-chat-notification',
    template: $('#tmpl-dm-chat-notification').html(),
    events: {
      'click .dm-chat-notification-accept': 'acceptNotification'
    },
    
    initialize: function() {
      this.on('acceptNotification', function() {
        enable_chat_open = true;
        
        a_chat_open.css({
          'opacity': '1',
          'cursor': 'pointer'
        });
        
        $('#dm-chat-open').trigger('click');
        
        // Broadcast this event, making it available to other scripts
        $('body').trigger('dmChatAcceptNotification');
      });
    },
    
    render: function() {
      var tmpl = _.template(this.template);
      this.$el.html(tmpl(this.model.toJSON())).appendTo('body');
      return this;
    },
    
    acceptNotification: function(e) {
      // Remove this notification
      this.remove();
      this.trigger('acceptNotification');
    }
  });
  
  
  /**
   * Instantiate messages view
   */
  var messages_view = new MessagesView();
  
  
  /**
   * Trigger chat
   */
  a_chat_open.on('click', function(e) {
    e.preventDefault();
    
    if (!enable_chat_open) {
      return;
    }
    
    if (div_chat.is(':visible')) {
      div_chat.hide();
    } else {
      div_chat.show();
    }
    
    if (div_chat.data('dm-chat-appended') === true) {
      return;
    }
    
    div_chat.data('dm-chat-appended', true);
    div_chat.appendTo($('body'));
  });
  
  
  /**
   * Communication
   */
  dm_socket.on('message', function (message) {
    var messages_num = messages_view.getNewMessagesNum(),
        notification_model,
        notification_view;
    
    if (message.type == 'chat') {
      if (DM_CHAT_GLOBALS.app == 'support' && messages_num === 0) {
        notification_model = new Notification({
          clientName: message.me,
          clientMessage: message.body,
          message: DM_CHAT_GLOBALS.t.newClientNotification
        });
        
        notification_view = new NotificationView({
          model: notification_model
        });
        
        notification_view.render();
      }
      
      messages_view.addMessage(message);
    }
  });
  
  
  /**
   * Send messages
   */
  $('.dm-chat-reply-submit', div_chat).on('click', function(e) {
    var $this = $(this),
        textarea_message = $('.dm-chat-reply > textarea', div_chat),
        textarea_message_val = textarea_message.val(),
        message,
        messages_num = messages_view.getNewMessagesNum();
    
    e.preventDefault();

    if ($.trim(textarea_message_val) == '') {
      // Nothing to send
      return;
    }
    
    // Setup message
    message = {
      type: 'chat',
      body: textarea_message_val,
      me: DM_CHAT_GLOBALS.me,
      time: new Date()
    };
    
    // Send message
    dm_socket.emit('message', message);
    
    // Add message to list
    messages_view.addMessage(message);
    
    textarea_message.val('');
  });
  
  
  /**
   * Send message on "enter" key up
   */
  $('.dm-chat-reply > textarea', div_chat).on('keypress', function(e) {
    if (e.which == 13 && e.shiftKey == false) {
      $('.dm-chat-reply-submit', div_chat).trigger('click');
      e.preventDefault();
    }
  });
  
} (jQuery));