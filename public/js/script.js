// reply button functionality
document.addEventListener('DOMContentLoaded', function() {
  // wil handle reply buttons
  const replyButtons = document.querySelectorAll('.reply-btn');
  
  replyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const commentId = this.getAttribute('data-comment-id');
      const replyForm = document.getElementById(`reply-form-${commentId}`);
      
      // Toggle form visibility
      if (replyForm.style.display === 'none') {
        replyForm.style.display = 'block';
        this.textContent = 'Cancel';
        this.classList.remove('btn-outline-primary');
        this.classList.add('btn-outline-secondary');
      } else {
        replyForm.style.display = 'none';
        this.innerHTML = '<i class="bi bi-reply"></i> Reply';
        this.classList.remove('btn-outline-secondary');
        this.classList.add('btn-outline-primary');
      }
    });
  });

  // Handle cancel reply buttons
  const cancelButtons = document.querySelectorAll('.cancel-reply');
  
  cancelButtons.forEach(button => {
    button.addEventListener('click', function() {
      const commentId = this.getAttribute('data-comment-id');
      const replyForm = document.getElementById(`reply-form-${commentId}`);
      const replyButton = document.querySelector(`.reply-btn[data-comment-id="${commentId}"]`);
      
      replyForm.style.display = 'none';
      replyButton.innerHTML = '<i class="bi bi-reply"></i> Reply';
      replyButton.classList.remove('btn-outline-secondary');
      replyButton.classList.add('btn-outline-primary');
    });
  });

  // Auto-dismiss alerts after 5 seconds of showing
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 5000);
  });

  // form validation feedback
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  });

  // character counter for textareas
  const textareas = document.querySelectorAll('textarea[maxlength]');
  textareas.forEach(textarea => {
    const maxLength = textarea.getAttribute('maxlength');
    const counter = document.createElement('small');
    counter.className = 'text-muted d-block mt-1';
    textarea.parentElement.appendChild(counter);

    function updateCounter() {
      const remaining = maxLength - textarea.value.length;
      counter.textContent = `${remaining} characters remaining`;
      if (remaining < 50) {
        counter.classList.add('text-warning');
      } else {
        counter.classList.remove('text-warning');
      }
    }

    textarea.addEventListener('input', updateCounter);
    updateCounter();
  });

  // confirm delete actions
  const deleteForms = document.querySelectorAll('form[action*="DELETE"]');
  deleteForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      if (!confirm('Are you sure you want to delete this?')) {
        e.preventDefault();
      }
    });
  });

  // will help Smooth scroll to top button
  const scrollButton = document.createElement('button');
  scrollButton.innerHTML = '<i class="bi bi-arrow-up"></i>';
  scrollButton.className = 'btn btn-primary position-fixed bottom-0 end-0 m-4 rounded-circle';
  scrollButton.style.display = 'none';
  scrollButton.style.width = '50px';
  scrollButton.style.height = '50px';
  scrollButton.style.zIndex = '1000';
  document.body.appendChild(scrollButton);

  window.addEventListener('scroll', function() {
    if (window.pageYOffset > 300) {
      scrollButton.style.display = 'block';
    } else {
      scrollButton.style.display = 'none';
    }
  });

  scrollButton.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});