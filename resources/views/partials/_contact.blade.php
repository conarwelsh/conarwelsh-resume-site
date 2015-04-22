<section id="contact">

	<table class="centerer">
		<tr>
			<td>
				<div class="content +centered">
					<form ng-submit="submitContactForm(contact)" method="post" action="/contact">
			            <h2>Contact Me</h2>

			            <div class="control">
			                <input type="text" ng-model="contact.name" name="name" placeholder="Your name..." required>
			                <label>Name</label>
			                <img src="/iconic-1.8.0/svg/smart/person.svg" class="iconic iconic-sm">
			            </div>

			            <div class="control">
			                <input type="email" ng-model="contact.email" name="email" placeholder="Your email address..." required>
			                <label>Email</label>
			                <img src="/iconic-1.8.0/svg/smart/envelope.svg" data-state="open" class="iconic iconic-sm">
			            </div>

			            <div class="control">
			                <textarea ng-model="contact.msg" name="msg" placeholder="Your message..."></textarea>
			                <label>Message</label>
			                <img src="/iconic-1.8.0/svg/smart/chat.svg" class="iconic iconic-sm">
			            </div>
			            
			            <button class="button" type="submit">
			                <img src="/iconic-1.8.0/svg/smart/thumb.svg" data-state="up" class="iconic iconic-md">
			                Send Message
			            </button>

			            <div class="messages" ng-show="showMessages">
			                <div class="success message" ng-show="success">
			                    <div>
			                        <img src="/iconic-1.8.0/svg/smart/check.svg" class="iconic iconic-lg">
			                    </div>
			                    Your message has been sent!
			                </div>

			                <div class="error message" ng-show="error">
			                    <div>
			                        <img src="/iconic-1.8.0/svg/smart/warning.svg" class="iconic iconic-lg">
			                    </div>
			                    There has been an error :(
			                </div>
			            </div>
			        </form>
		        </div>
			</td>
		</tr>
	</table>

</section>