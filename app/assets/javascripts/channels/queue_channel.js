/**
 * Fired by click events to collect relevant data and dispatch an RPC to the
 * server via ActionCable's perform() method.
 */
function CourseQueueClientActionHandler(subscription) {
  this.subscription = subscription;
}

CourseQueueClientActionHandler.prototype.fire = function (e) {
  var target = e.currentTarget;
  var action = $(target).data('cable-action');

  if (action === 'new_request') {
    this.newRequest(target);
  } else if (action === 'queue_pop') {
    this.queuePop(target);
  } else if (action === 'resolve_request') {
    this.resolveRequest(target);
  } else if (action === 'destroy_request') {
    this.destroyRequest(target);
  } else if (action === 'instructor_status_toggle') {
    this.instructorStatusToggle(target);
  }
}

CourseQueueClientActionHandler.prototype.newRequest = function (selector) {
  var form = $(selector).parent();

  var location    = form.find('input[name=location]').val();
  var description = form.find('textarea[name=description]').val();

  this.subscription.perform('new_request', {
    location: location,
    description: description,
  });
};

CourseQueueClientActionHandler.prototype.queuePop = function (selector) {
  this.subscription.perform('queue_pop');
};

CourseQueueClientActionHandler.prototype.instructorStatusToggle = function (selector) {
  var newStatus = !$(selector).data('online');

  $(selector).data('online', newStatus);

  this.subscription.perform('instructor_status_toggle', {
    online: newStatus,
  });
};

CourseQueueClientActionHandler.prototype.resolveRequest = function (selector) {
  var requestId = $(selector).data('id');

  this.subscription.perform('resolve_request', {
    id: requestId,
  });
};

CourseQueueClientActionHandler.prototype.destroyRequest = function (selector) {
  var requestId = $(selector).data('id');

  this.subscription.perform('destroy_request', {
    id: requestId,
  });
};

$(document).ready(function () {
  setInterval(updateRelativeTimestamps, 15000);

  var queueId = $('#course-queue-name').data('course-queue-id');

  // Create the new ActionCable subscription for this course queue
  var courseQueueSubscription = App.cable.subscriptions.create({
    channel: 'QueueChannel',
    id: $('#course-queue-name').data('course-queue-id'),
  }, {
    connected: function () {
      getOutstandingRequests(queueId, function (requests) {
        emptyRequestsContainer();
        requests.forEach(renderRequest);

        getOnlineInstructors(queueId, function (instructors) {
          emptyInstructorsContainer();
          instructors.forEach(renderInstructor);

          fixupPage();
        });
      });
    },
    disconnected: function () {
      disablePage();
    },
    received: function (data) {
      if (data.action === 'new_request') {
        renderRequest(data.request);
      } else if (data.action === 'resolve_request') {
        deleteRequestById(data.request.id);
      } else if (data.action === 'instructor_offline') {
        deleteInstructorById(data.instructor.id);
      } else if (data.action === 'instructor_online') {
        renderInstructor(data.instructor);
      }

      fixupPage();
    },
  });

  var handler = new CourseQueueClientActionHandler(courseQueueSubscription);

  // Attach the handler to click actions
  $(document).on('click', '[data-cable-action]', handler.fire.bind(handler));
});
