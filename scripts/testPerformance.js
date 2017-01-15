function testNoise(noise, image, cycles) {

	var start = performance.now();

	for(var i = 0; i < cycles; ++i) {
		noise.generate(image);
	}

	var stop = performance.now();

	return (stop - start) / cycles;
}