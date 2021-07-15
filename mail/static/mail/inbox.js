document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);
  document.querySelector('#compose-form').addEventListener('submit' , sent_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function validation(email) {

  const reg = /^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9\-]+\.)+([a-zA-Z0-9\-\.]+)+([,]([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9\-]+\.)+([a-zA-Z0-9\-\.]+))*$/;
  const format_email = String(email);
  const valid = reg.test(format_email);
  return valid;

}

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#Reply').style.display = 'none';
  document.querySelector('#New').style.display = 'block';
  document.querySelector('#compose-label').style.display = 'none';
  document.querySelector('#alert').style.display = 'none';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

}

function reply_email(email) {

  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#Reply').style.display = 'block';
  document.querySelector('#New').style.display = 'none';
  document.querySelector('#compose-label').style.display = 'none';

  fetch(`/emails/${email.id}`)
  .then(response => response.json())
  .then(email => {
    console.log(email);
    document.querySelector('#compose-recipients').value = email.sender;
    if (email.subject.startsWith("Re: ")) {
      document.querySelector('#compose-subject').value = email.subject;
    } else {
      document.querySelector('#compose-subject').value = `Re: ${email.subject}`;
    }
    document.querySelector('#compose-body').value = `On ${email.timestamp}, ${email.sender} wrote: ${email.body}`;
  });
}

async function archive(email) {
  try {
    if (email.archived == false) {
      await fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          archived: true
        })
      })
    } else {
      await fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          archived: false
        })
      })
    }
  } catch (error) {
    console.log(error);
  }
  load_mailbox('inbox');
}

function view_email(email_id, mailbox) {

  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'block';

  const archive_button = document.querySelector('#archive');
  const reply_button = document.querySelector('#reply');
  
  fetch(`/emails/${email_id}`)
  .then(response => response.json())
  .then(email => {
    // Print email
    if (mailbox !== 'sent') {
      if (email.archived == true) {
        archive_button.style.display = 'inline';
        archive_button.innerText = 'Unarchive';
      } else {
        archive_button.style.display = 'inline';
        archive_button.innerText = 'Archive';
      }
    } else {
      archive_button.style.display = 'none';
    }
    console.log(email);
    document.querySelector('#head').innerHTML = `<strong>From: </strong>${email.sender}<br><strong>To: </strong>${email.recipients}<br><strong>Subject: </strong>${email.subject}<br><strong>Timestamp: </strong>${email.timestamp}`;
    document.querySelector('#body').innerText = email.body;
    // ... do something else with email ...
    if (email.read == false) {
      fetch(`/emails/${email.id}`, {
        method: 'PUT',
        body: JSON.stringify({
            read: true
        })
      })
    }
    archive_button.addEventListener('click', () => archive(email), {once: true});
    reply_button.addEventListener('click', () => reply_email(email), {once: true});
  });
}

function load_mailbox(mailbox) {
  
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    console.log(emails);
    emails.forEach(email => {
      const parentDiv = document.createElement('div');
      parentDiv.id = 'parent_div';
      if (email.read == false) {
        parentDiv.className = 'list-group-item';
      } else {
        parentDiv.className = 'list-group-item list-group-item-secondary';
      }
      if (mailbox === 'inbox') {
        parentDiv.innerHTML = `<div class="row"><div class="col-4">${email.sender}</div><div class="col-4">${email.subject}</div><div class="col-4">${email.timestamp}</div></div>`;
      } else if (mailbox === 'archive' && (email.archived == true)) {
        parentDiv.innerHTML = `<div class="row"><div class="col-4">${email.sender}</div><div class="col-4">${email.subject}</div><div class="col-4">${email.timestamp}</div></div>`;
      } else {
        parentDiv.innerHTML = `<div class="row"><div class="col-4">${email.recipients.join(", ")}</div><div class="col-4">${email.subject}</div><div class="col-4">${email.timestamp}</div></div>`;
      }
      parentDiv.addEventListener('click', () => view_email(email.id, mailbox)); 
      document.querySelector('#emails-view').append(parentDiv);
    }); 
  });
}

function sent_email(e) {

  e.preventDefault();
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;
  const label = document.querySelector('#compose-label');
  const alert = document.querySelector('#alert');

  if (recipients !== '') {
    label.style.display = 'none';
    const recipient = recipients.split(",");
    for (email in recipient) {
      if (validation(recipient[email])) {
                              
        fetch('/emails', {
          method: 'POST',
          body: JSON.stringify({
              recipients: recipient[email].toLowerCase(),
              subject: subject,
              body: body
          })
        })
        .then(response => response.json())
        .then(result => {
            // Print result
            console.log(result);
            if (result['error']) {
              alert.style.display = 'block';
              alert.className = 'alert alert-danger';
              alert.innerText = `${result['error']}`;
            } else {
              load_mailbox('sent');
            }
        })
      } else {
        label.style.display = 'block';
      }
    }
  } else {
    label.style.display = 'block';
  }
}

