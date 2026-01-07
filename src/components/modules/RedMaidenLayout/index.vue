<template>
  <div class="app-container">
    <!-- Main container with border radius -->
    <div class="main-container">
      <!-- Left sidebar -->
      <div class="left-sidebar">
        <div class="back-button">
          <span class="arrow">&lt;</span>
        </div>

        <div class="ruby-volution">
          <h3>RUBY<br />VOLUTION</h3>
        </div>

        <div class="sidebar-content">
          <div class="sidebar-text">
            <p>
              The character of the "red maiden" can serve as a representation of an individual's connection to passion,
              power, and courage or attract trends they wish to possess or tap into as a symbol of the courage of
              attracts trends they wish to possess.
            </p>
          </div>

          <div class="sidebar-text">
            <p>
              In literature, "red maiden" often appears as a character with magical powers or an important role in the
              story, typically symbolized by her red robe as a sign of strength or mystery.
            </p>
          </div>
        </div>

        <div class="target-icon">
          <div class="circle"></div>
        </div>
      </div>

      <!-- Middle section -->
      <div class="middle-section">
        <div class="top-section">
          <div class="two-thousand">
            <h3>TWO<br />THOUSA24</h3>
          </div>

          <div class="emoji-group">
            <div class="emoji">☺️</div>
            <div class="emoji">☺️</div>
            <div class="emoji">☺️</div>
          </div>

          <div class="red-everywhere">
            <p>Red Everywhere</p>
          </div>

          <div class="year">
            <p>2024</p>
          </div>
        </div>

        <!-- Red Maiden header -->
        <div class="red-maiden-header">
          <h1>Red<span class="play-icon">▶▶</span><br />Maiden</h1>
          <div class="arrow-circle">
            <span>→</span>
          </div>
        </div>

        <!-- Tags section -->
        <div class="tags-section">
          <div class="tag">COLOUR</div>
          <div class="tag">SYMBOL</div>
          <div class="tag">RED</div>
          <div class="tag">VITALITY</div>
          <div class="tag">EMOTIONS</div>
          <div class="tag">LOVE</div>
          <div class="tag">REBELLION</div>
          <div class="tag">HOT</div>
          <div class="tag">DESIRES</div>
          <div class="tag">CHARACTER</div>
          <div class="tag active">ATTRACTIVENESS <span>×</span></div>
        </div>

        <div class="credit">
          <p>MADE WITH<br />ADOBE ILLUSTOP</p>
          <p>DESIGN<br />28 OF 365</p>
          <p>DESIGNED BY<br />XAMPLEES</p>
        </div>
      </div>

      <!-- Right main image section -->
      <div class="right-section">
        <div class="red-circle"></div>

        <div class="main-image">
          <!-- Text at the top of the image -->
          <div class="image-header-text">
            <p>the color of the emotions<br />of love and rebellion</p>
          </div>

          <!-- Red hooded figure image would be here -->
          <div class="red-figure">
            <!-- This would be the image in a real implementation -->
            <div class="grid-overlay">
              <div class="grid-item">Live<br />Liness</div>
              <div class="grid-item">Vitality</div>
              <div class="grid-item">Red<br />Gem<br />Stone</div>
              <div class="grid-item">Lucky<br />Ruby</div>
              <div class="grid-item">Bra<br />very</div>
              <div class="grid-item">Love<br />Energy</div>
            </div>
          </div>

          <!-- Footer tag section -->
          <div class="image-footer">
            <div class="footer-tag">
              <p>THE<span class="red-text">COLOR</span>OF</p>
              <p class="red-text">LOVE</p>
              <p class="red-text">REBELLION</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Vue 3 Composition API can be used here if needed
</script>

<style scoped>
.app-container {
  font-family: Arial, sans-serif;
  background-color: #000;
  padding: 20px;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.main-container {
  width: 95%;
  height: 90vh;
  background-color: white;
  border-radius: 30px;
  display: flex;
  overflow: hidden;
  position: relative;
}

/* Left sidebar styles */
.left-sidebar {
  width: 20%;
  background: linear-gradient(to bottom, #ffeaea, #ffcece);
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 20px;
  border-right: 1px solid #ddd;
}

.back-button {
  width: 50px;
  height: 50px;
  background-color: white;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.arrow {
  font-size: 24px;
  color: #aaa;
}

.ruby-volution {
  margin-bottom: 30px;
}

.ruby-volution h3 {
  font-size: 1.2rem;
  color: #333;
  font-weight: bold;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  transform: rotate(-90deg);
  transform-origin: left top;
  width: 300px;
  position: absolute;
  top: 50%;
  left: 15px;
}

.sidebar-text p {
  font-size: 0.8rem;
  color: #444;
}

.target-icon {
  width: 40px;
  height: 40px;
  border: 2px solid #a02020;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.circle {
  width: 15px;
  height: 15px;
  background-color: #a02020;
  border-radius: 50%;
}

/* Middle section styles */
.middle-section {
  width: 30%;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.top-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 50px;
}

.two-thousand h3 {
  font-size: 1.2rem;
  color: #444;
  font-weight: bold;
}

.emoji-group {
  display: flex;
  gap: 5px;
}

.emoji {
  font-size: 1.2rem;
}

.red-everywhere p {
  font-size: 0.9rem;
  color: #a02020;
}

.year p {
  font-size: 0.9rem;
  color: #a02020;
}

.red-maiden-header {
  margin-top: auto;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-end;
}

.red-maiden-header h1 {
  font-size: 4rem;
  font-weight: bold;
  line-height: 0.9;
}

.play-icon {
  font-size: 2rem;
  vertical-align: middle;
}

.arrow-circle {
  width: 30px;
  height: 30px;
  border: 2px solid #a02020;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 15px;
  margin-bottom: 15px;
}

.tags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 40px;
}

.tag {
  padding: 5px 15px;
  border: 1px solid #ccc;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #444;
}

.tag.active {
  background-color: #a02020;
  color: white;
}

.credit {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  color: #666;
}

/* Right section styles */
.right-section {
  width: 50%;
  position: relative;
}

.red-circle {
  width: 50px;
  height: 50px;
  background-color: #a02020;
  border-radius: 50%;
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 2;
}

.main-image {
  width: 100%;
  height: 100%;
  background-color: #e6e9f0;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-header-text {
  padding: 20px;
  color: #999;
  font-size: 0.9rem;
}

.red-figure {
  flex-grow: 1;
  position: relative;
  background-color: #e6e9f0;
}

.grid-overlay {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 60%;
  height: 70%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
}

.grid-item {
  border: 1px solid rgba(255, 255, 0, 0.3);
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  text-align: center;
}

.image-footer {
  padding: 10px;
  background-color: rgba(230, 233, 240, 0.8);
}

.footer-tag {
  display: flex;
  justify-content: space-around;
  align-items: center;
  font-size: 0.7rem;
  color: #666;
}

.red-text {
  color: #a02020;
}

/* Stylistic elements for the red star symbols */
.red-star {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 2px solid #a02020;
  transform: rotate(45deg);
}

/* Position the red stars around the design */
.star-top {
  top: 20%;
  left: 50%;
}

.star-bottom {
  bottom: 20%;
  left: 20%;
}

.star-right {
  top: 40%;
  right: 10%;
}

/* Responsive adjustments could be added here */
@media (max-width: 1024px) {
  /* Adjust for smaller screens */
}
</style>
