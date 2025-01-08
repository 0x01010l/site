document.getElementById('getProfileAndStoryButton').addEventListener('click', async () => {
    const username = document.getElementById('username').value.trim();
    const profilePic = document.getElementById('profilePic');
    const followerCount = document.getElementById('followerCount');
    const followingCount = document.getElementById('followingCount');
    const mediaCount = document.getElementById('mediaCount');
    const storyContent = document.getElementById('storyContent');
    const loader = document.getElementById('loader');
    const profileInfo = document.querySelector('.profile-info');
    const topCenter = document.querySelector('.top-center');
    const refreshButton = document.getElementById('refreshButton');
    const inputContainer = document.querySelector('.input-container');
    storyContent.innerHTML = ''; // Clear previous results

    if (!username) {
        alert('Please enter a username.');
        return;
    }

    loader.style.display = 'block'; // Show the loader

    try {
        // Fetch user info using Cloudflare Worker
        const userInfoUrl = `https://calm-thunder-1404.0x19980204.workers.dev/?url=https://anonyig.com/api/ig/userInfoByUsername/${username}`;
        const userInfoResponse = await fetch(userInfoUrl, { method: 'GET' });
        if (!userInfoResponse.ok) {
            throw new Error(`HTTP error! Status: ${userInfoResponse.status}`);
        }
        const userInfo = await userInfoResponse.json();
        console.log('User Info:', userInfo); // Log the user info response

        if (!userInfo || !userInfo.result || !userInfo.result.user) {
            throw new Error('Invalid user info response');
        }

        const user = userInfo.result.user;

        // Update profile info
        if (user.hd_profile_pic_url_info) {
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(user.hd_profile_pic_url_info.url)}`;
            const imgResponse = await fetch(proxyUrl);
            const imgBlob = await imgResponse.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                profilePic.src = reader.result;
            };
            reader.readAsDataURL(imgBlob);
        } else {
            profilePic.src = ''; // Clear the profile picture if not available
        }
        followerCount.textContent = `Followers: ${formatCount(user.follower_count)}`;
        followingCount.textContent = `Following: ${formatCount(user.following_count)}`;
        mediaCount.textContent = `Posts: ${formatCount(user.media_count)}`;

        // Show the profile info
        profileInfo.style.display = 'flex';

        // Hide the top center elements
        topCenter.style.display = 'none';

        // Hide the input container
        inputContainer.style.display = 'none';

        // Show the refresh button
        refreshButton.style.display = 'block';

        // Use the Cloudflare Worker as a relayer for stories
        const apiUrl = `https://calm-thunder-1404.0x19980204.workers.dev/?url=https://anonyig.com/api/ig/story?url=https://www.instagram.com/stories/${username}/`;

        // Fetch the story data
        const response = await fetch(apiUrl, { method: 'GET' });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Story Data:', data); // Log the story data response
        const stories = data.result;

        // Check if stories exist
        if (!stories || stories.length === 0) {
            storyContent.innerHTML = '<p>No stories available for this user.</p>';
            loader.style.display = 'none'; // Hide the loader
            return;
        }

        // Display the first story
        let currentIndex = 0;
        const storyElements = stories.map(story => {
            let element;
            if (story.video_versions && story.video_versions.length > 0) {
                element = document.createElement('video');
                element.src = story.video_versions[0].url;
                element.controls = true;
            } else if (story.image_versions2 && story.image_versions2.candidates.length > 0) {
                const imgUrl = story.image_versions2.candidates[0].url;
                const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(imgUrl)}`;
                element = document.createElement('img');
                element.src = proxyUrl;
            }
            return element;
        });

        function showStory(index) {
            storyContent.innerHTML = '';
            const element = storyElements[index];
            storyContent.appendChild(element);
            resizeStoryElements();

            // Set a timer to auto-swipe after 8 seconds for images
            clearTimeout(autoSwipeTimer);
            if (element.tagName === 'IMG') {
                autoSwipeTimer = setTimeout(() => {
                    showNextStory();
                }, 8000);
            }

            // If the element is a video, autoplay it and reset the timer when it ends
            if (element.tagName === 'VIDEO') {
                element.autoplay = true;
                element.onended = () => {
                    clearTimeout(autoSwipeTimer);
                    showNextStory();
                };
            }
        }

        function showPrevStory() {
            currentIndex = (currentIndex > 0) ? currentIndex - 1 : storyElements.length - 1;
            showStory(currentIndex);
        }

        function showNextStory() {
            currentIndex = (currentIndex < storyElements.length - 1) ? currentIndex + 1 : 0;
            showStory(currentIndex);
        }

        let autoSwipeTimer;
        showStory(currentIndex);

        document.querySelector('.prev').addEventListener('click', showPrevStory);
        document.querySelector('.next').addEventListener('click', showNextStory);

        // Resize story elements based on screen size
        function resizeStoryElements() {
            const elements = document.querySelectorAll('video, img');
            elements.forEach(element => {
                if (window.innerWidth <= 480) {
                    element.style.maxWidth = '90%';
                    element.style.maxHeight = '90%';
                } else if (window.innerWidth <= 768) {
                    element.style.maxWidth = '70%';
                    element.style.maxHeight = '70%';
                } else {
                    element.style.maxWidth = '50%';
                    element.style.maxHeight = '50%';
                }
            });
        }

        // Call resizeStoryElements on window resize
        window.addEventListener('resize', resizeStoryElements);

    } catch (error) {
        console.error('Fetch error:', error);
        storyContent.innerHTML = `<p>Error: ${error.message}</p>`;
    } finally {
        loader.style.display = 'none'; // Hide the loader
    }
});

document.getElementById('refreshButton').addEventListener('click', () => {
    location.reload();
});

function formatCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    } else {
        return count.toString();
    }
}