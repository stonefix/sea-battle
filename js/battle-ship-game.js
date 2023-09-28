(function($){
	$(document).ready(function(e) {
		var inputErrorTimeout,  // Time counter
			player_name = '',   // Player's name
			player_name_input = $('#player-name-input'), // Input field for the player's name
	
			//loading_indicator = $('.loading'),  // Page loading indicator
			game_status = $('#game-status'),    // Game status ('It's your turn now', 'Computer's turn now...')
	
			player_field = $('#player-field'),    // Player's field
			computer_field = $('#computer-field'), // Computer's field
			
			player_array = [],    // Array containing information about the player's ship placement
			computer_array = [],  // Array containing information about the computer's ship placement
	
			player_td,   // All td elements on the player's field
			computer_td, // All td elements on the computer's field
			
			move_count = 0,  // Number of ship movements during placement, necessary to avoid deadlock situations
			field_size = 10, // Field size
			flag_block_player = false,  // Player's block state during the computer's turn
			max_points = 0,
			player_points,
			computer_points,
			score_game = [0, 0];
	
		// Variables for computer gameplay tactics
		var computer_variants = [],        // All computer attack variants as a 10x10 array
			computer_variants_coords = [], // Attack variants containing cell coordinates. When a strike occurs, an element is removed from the array
			computer_strike_variants = [],    // Possible attack variants
			computer_td_direction = -1,    // Determine the orientation of the ship (-1 - unknown, 0 - horizontal, 1 - vertical)
			last_coords = [];              // Coordinates of the last successful shot
	


			/* ------- GAME START ------- */
		/* Attach the game start function to events */
		$('#start-game-form').on('submit', startGame);
		$('.start-game-btn').on('click', startGame);

		$('.new-game-btn').on('click', function(){
			resetScore();
			startGame();
		});

		/* Attach the game end function to the button with the class .exit-game-btn */
		$('.exit-game-btn').on('click', exitGame);

		/* Function to check the support of a CSS property in the browser */
		function propIsSupported(prop) {
			return (prop in document.body.style);
		}

		/* Function to start the game */
		function startGame(){
			/* ----- User Input Validation ----- */
			var input_info = $('#player-name-input-info');
			// Get the user's name from the input and immediately remove extra spaces
			player_name = $.trim(player_name_input.val());    
			// Define allowed characters as a regular expression
			var symbols = /^[A-Za-zА-Яа-я0-9 .]{0,}$/;

			// If the entered username contains invalid characters or the field is empty,
			// display an error and exit the function
			if(player_name.length == 0 || symbols.test(player_name) == false){
				showInputError(player_name_input, input_info);
				return false;
			}

			// Reset variable values
			flag_block_player = false;
			computer_variants = [];
			computer_variants_coords = [];
			computer_strike_variants = [];
			computer_td_direction = -1;
			last_coords = [];
			move_count = 0;

			player_points = 0;
			computer_points = 0;

			input_info.removeClass('show');
			$('#score-player-name').html(player_name);

			// Generate player and computer tables
			player_array = generateTable(player_field, player_array);
			computer_array = generateTable(computer_field, computer_array);

			// Show ships in the table
			showShips(player_field, player_array);

			player_td = player_field.find('td');
			computer_td = computer_field.find('td');

			generateVariants();

			// Enable game mode
			$('body').removeClass('play-game show-main-menu game-win game-losing');
			$('body').addClass('play-game');

			unblockPlayer();

			// Remove loading indicator
			// loading_indicator.delay(100).fadeOut(100);
			return false;
		}



/* Table Generation Function. Takes a <table></table> object as input. */
		function generateTable(table, array){
			move_count = 0;
			var tr_html = '',
			alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

			array = [];
			// Clear the table
			table.html('');
			// Iterating through rows
			for (var i = 0; i < field_size; i++){
				tr_html = '<tr>';
				array.push([]);
				// Iterating through columns
				for (var j = 0; j < field_size; j++){
					// Open the td tag and add a space
					tr_html += '<td> &nbsp;';
					// If it's the first row, add a row marker
					if(j == 0)
						tr_html += '<div class="marker-row">' + (i + 1) + '</div>';
					// If it's the first column, add a column marker
					if(i == 0)
						tr_html += '<div class="marker-col">' + (alphabet[j]) + '</div>';
					// Close the td tag
					tr_html += '</td>';
					array[i].push(0);
				}
				tr_html += '</tr>';
				// Add the generated row to the table
				table.append(tr_html);
			}
			generateShips(array);
			return array;
		}


		function generateVariants(){
			computer_variants = [];
			computer_variants_coords = [];
			for (var i = 0; i < field_size; i++) {
				var row = []; 
				for (var j = 0; j < field_size; j++) {
					row.push(0);
					computer_variants_coords.push([i, j]);
				}
				computer_variants.push(row);
			}
		}


		/* Ship Generation Function */
		function generateShips(array){
			var ship_count = 1, // How many ships of this size need to be placed (e.g., 1 => 4-deck, 2 => 3-deck, etc.)
				ship_size;

			// Determine the number of ship types + 1
			var max_ships_n = Math.floor(field_size / 2); // = 5 (For a 10x10 field)
			max_points = 0;
			// Iterating through ship sizes
			while(ship_count < max_ships_n){
				ship_size = max_ships_n - ship_count; // Ship size
				
				// Iterating through the number of ships of a certain size
				for (var i = 0; i < ship_count; i++) {
					var ship = {
						size: ship_size,
						id: ship_size + '' + i,
						direction: rand(0, 1)  // Orientation. 0 - horizontal, 1 - vertical 
					};
					addShip(array, ship);
					max_points += ship_size;
				}

				ship_count++;
			}
		}



		/* Функция добавления нового корабля */ 
		function addShip(array, ship){			
			var variants = [];
			var dir = ship.direction;
			for (var i = 0; i < field_size; i++) {
				for (var j = 0; j < field_size; j++) {
					if(array[i][j] == 0)
					{	
						var flag_it_fit = true;
						for (var k = 0; k < ship.size; k++) {

							var new_i = (dir == 1) ? i + k : i,
								new_j = (dir == 0) ? j + k : j;
							if(new_i > field_size - 1 || new_j > field_size - 1 || array[new_i][new_j] > 0){
								flag_it_fit = false;
								break;
							}

							if(flag_it_fit == true)
								flag_it_fit = !checkPerimeter(array, new_i, new_j, dir, ship.size);
						}
						if(flag_it_fit == true){
							variants.push([i, j]);
						}
					}
				}
			}

			var random_num = rand(0, variants.length - 1);
			var location = variants[random_num];

			if(variants.length == 0){
				if(move_count == 0){
					ship.direction = (ship.direction == 0) ? 1 : 0;
					addShip(array, ship);
					move_count++;
					return false;
				}
				if(move_count == 1){
					return false;
				}
			}
			else{

				for (var k = 0; k < ship.size; k++) {
					var new_i = (dir == 1) ? location[0] + k : location[0],
						new_j = (dir == 0) ? location[1] + k : location[1];
					array[new_i][new_j] = ship.id + ship.direction;
				}
				var perimeter = getPerimeterIndexes(array, location[0], location[1], dir, ship.size);
				for (var k = 0; k < perimeter.length; k++) {
					setCellValue(array, perimeter[k][0], perimeter[k][1], -1);
				}
			}
		}

		function checkPerimeter(array, i, j, dir, ship_size){
			var perimeter = getPerimeterIndexes(array, i, j, dir, ship_size),
				exist_flag_ship = false;
			for (var i = 0; i < perimeter.length; i++) {
				exist_flag_ship = existShip(array, perimeter[i][0], perimeter[i][1]);
				if(exist_flag_ship == true)
					break;
			}
			return exist_flag_ship;
		}

		function getPerimeterIndexes(array, i, j, dir, ship_size){
			var indexes = [];
			for (k = 0; k < ship_size; k++) {				
				var new_i = (dir == 1) ? i + k : i,
					new_j = (dir == 0) ? j + k : j;

				if (dir == 1)
				{	
					indexes.push([new_i,   new_j-1]);
					indexes.push([new_i,   new_j+1]);

					if(k == 0){	
						indexes.push([new_i-1, new_j-1]);
						indexes.push([new_i-1, new_j]);
						indexes.push([new_i-1, new_j+1]);
					}

					if(k == ship_size-1){
						indexes.push([new_i+1, new_j-1]);
						indexes.push([new_i+1, new_j]);
						indexes.push([new_i+1, new_j+1]);
					}
				}
				
				if (dir == 0)
				{	
					indexes.push([new_i-1,   new_j]);
					indexes.push([new_i+1,   new_j]);

					if(k == 0){	
						indexes.push([new_i-1, new_j-1]);
						indexes.push([new_i,   new_j-1]);
						indexes.push([new_i+1, new_j-1]);
					}

					if(k == ship_size-1){
						indexes.push([new_i-1, new_j+1]);
						indexes.push([new_i,   new_j+1]);
						indexes.push([new_i+1, new_j+1]);
					}
				}
			}
			return indexes;
		}

		function existShip(array, i, j){ 
			if(i < 0 || j < 0 || i >= field_size || j >= field_size)
				return false;
			if(array[i][j] > 0)
				return true;
			else
				return false;
		}

		function setCellValue(array, i, j, value){
			if(i > -1 && j > -1 && i < field_size && j < field_size && array[i][j] < 1){
				array[i][j] = value;
			}
		}

		function showShips(table, array){
			var td = table.find('td');
			for (var i = 0; i < field_size; i++) {
				for (var j = 0; j < field_size; j++) {
					if(array[i][j] > 0)
						$(td[i * field_size + j]).addClass('ship');
				}
			}
		}

		function showInputError(input, input_info){
			input.addClass('error');
			input_info.addClass('show');
			input.focus();
			clearTimeout(inputErrorTimeout);
			inputErrorTimeout = setTimeout(function(){
				input.removeClass('error');
			}, 800);
		}


		function exitGame(){
			score_game = [0, 0];
			resetScore();
			$('body').removeClass('play-game show-main-menu game-win game-losing');
			$('body').addClass('show-main-menu');
		}

		function resetScore(){
			score_game = [0, 0];
			$('#score-game').html('0 : 0');
		}

		function rand(min, max){
			if( max ) {
				return Math.floor(Math.random() * (max - min + 1)) + min;
			} else {
				return Math.floor(Math.random() * (min + 1));
			}
		}

		$(document).on('click','#computer-field td:not(.strike, .missed)',function() {
			if(flag_block_player == true)
				return false;
			var td = $(this);
			blockPlayer();
			fire(td, computer_td, computer_array, false);
		});

		function fire(td, array_td, array, computer_event){
			var coords = getCords(array_td, td);
			var row = coords[0];
			var cell = coords[1];
			
			if(computer_event){
				computer_variants[row][cell] = 1;
			}

			if(array[row][cell] > 0)
				strike(td, array_td, array, row, cell, computer_event);
			else{
				if(computer_event == false){
					stepComputer();
					missed(td);
				}
				else
					{	
						unblockPlayer();
						$(player_field.find('.last-missed')).removeClass('last-missed');
						missed(td);
						td.addClass('last-missed');
					}
			}
		}

		function strike(td, array_td, array, row, cell, computer_event){
			if(computer_event == false)
				unblockPlayer();

			td.addClass('strike');
			var value = array[row][cell];
			array[row][cell] = value * (-1); 
			var flag_kill = true;

			var dir = parseInt(value.charAt(2));
			var shipwreck = [];
			var ship_size = parseInt(value.charAt(0));

			if(ship_size == 1){
				shipwreck.push([row, cell]);
			}
			else
			for (var i = 0; i < field_size; i++) {
				if(dir == 0){
					if(array[row][i] == -value)
						shipwreck.push([row, i]);
				}

				if(dir == 1){
					if(array[i][cell] == -value)
						shipwreck.push([i, cell]);
				}
			}

			if(shipwreck.length == ship_size)
			{	
				for (var i = 0; i < ship_size; i++) {
					var kill_td = array_td[shipwreck[i][0]*field_size + shipwreck[i][1]];
					$(kill_td).addClass('kill');
					
					if(computer_event == true){
						setCellValue(computer_variants, shipwreck[i][0], shipwreck[i][1], 1);
						deleteCoordPoint(computer_variants_coords, shipwreck[i][0], shipwreck[i][1]);
					}
				}

				var perimeter = getPerimeterIndexes(array, shipwreck[0][0], shipwreck[0][1], dir, ship_size);
			   	
				for (var i = 0; i < perimeter.length; i++) {
					markTd(array_td, perimeter[i][0], perimeter[i][1], 'missed');

					if(computer_event == true){
						setCellValue(computer_variants, perimeter[i][0], perimeter[i][1], 1);
						deleteCoordPoint(computer_variants_coords, perimeter[i][0], perimeter[i][1]);
					}
				}

				if(computer_event == true){
					computer_strike_variants = [];
					last_coords = [];
					computer_td_direction = -1;
					computer_points += ship_size;
					if(computer_points == max_points){
						endGame();
						return false;
					}
					else
						stepComputer();
				}
				else{
					player_points += ship_size;
					if(player_points == max_points){
						endGame();
						return false;
					}
				}
			}
			else{
				if(computer_event == true){
					if(last_coords.length == 2){
						last_coords.push([row, cell]);
						last_coords = MinMaxLastCoords(last_coords, computer_td_direction);
					}
					else
						last_coords.push([row, cell]);

					if(last_coords.length == 2){
						if(computer_td_direction == -1)
							computer_strike_variants = [];

						if(last_coords[0][0] == last_coords[1][0]){
							computer_td_direction = 0;
						}
						else
							if(last_coords[0][1] == last_coords[1][1]){
								computer_td_direction = 1;
							}

					}

					if(computer_td_direction == -1){
						if(checkCellForFire(computer_variants, row + 1, cell) == true)
							computer_strike_variants.push([row + 1, cell]);
						
						if(checkCellForFire(computer_variants, row - 1, cell) == true)
							computer_strike_variants.push([row - 1, cell]);

						if(checkCellForFire(computer_variants, row, cell + 1) == true)
							computer_strike_variants.push([row, cell + 1]);

						if(checkCellForFire(computer_variants, row, cell - 1) == true)
							computer_strike_variants.push([row, cell -1]);

						stepComputer();
					}
					else
					if(computer_td_direction == 0){

						var left_coord,
							right_coord;

						if(last_coords[0][1] < last_coords[1][1]){
							left_coord = last_coords[0];
							right_coord = last_coords[1];
						}
						else{
							left_coord = last_coords[1];
							right_coord = last_coords[0];
						}

						if(checkCellForFire(computer_variants, left_coord[0] , left_coord[1] - 1) == true)
							computer_strike_variants.push([left_coord[0] , left_coord[1] - 1]);

						if(checkCellForFire(computer_variants, right_coord[0], right_coord[1] + 1) == true)
							computer_strike_variants.push([right_coord[0] , right_coord[1] + 1]);

						stepComputer();
					}
					else
					if(computer_td_direction == 1){

						var top_coord = 0,
							bottom_coord =0;

						if(last_coords[0][0] < last_coords[1][0]){
							top_coord = last_coords[0];
							bottom_coord = last_coords[1];
						}
						else{
							top_coord = last_coords[1];
							bottom_coord = last_coords[0];
						}

						if(checkCellForFire(computer_variants, top_coord[0] - 1, top_coord[1]) == true)
							computer_strike_variants.push([top_coord[0] - 1, top_coord[1]]);

						if(checkCellForFire(computer_variants, bottom_coord[0] + 1, bottom_coord[1]) == true)
							computer_strike_variants.push([bottom_coord[0] + 1, bottom_coord[1]]);
						stepComputer();
					}
				}
			}
		}

		function MinMaxLastCoords(last_coords, dir){
			var min = last_coords[0], 
			    max = last_coords[0];

			if(dir == 1){
				for (var i = 1; i < last_coords.length; i++) {
					if(last_coords[i][0] > max[0])
						max = last_coords[i];

					if(last_coords[i][0] < min[0])
						min = last_coords[i];
				}
			}
			else
			if(dir == 0){
				for (var i = 1; i < last_coords.length; i++) {
					if(last_coords[i][1] > max[1])
						max = last_coords[i];

					if(last_coords[i][1] < min[1])
						min = last_coords[i];
				}
			}
			return [min, max];
		}

		function checkCellForFire(array, i, j){
			if(i < 0 || j < 0 || i >= field_size || j >= field_size)
				return false;
			else{
				if(computer_variants[i][j] == 0)
					return true;
				else
					return false;
			}
		}


		function markTd(array_td, i, j, class_td){
			if(i > -1 && j > -1 && i < field_size && j < field_size){
				$(array_td[ i * field_size + j]).addClass(class_td);
			}
		}

		function missed(td){

			td.addClass('missed');
		}

		function blockPlayer(){
			flag_block_player = true;
			$('#computer-field').addClass('block-player');
			$('#game-status').addClass('computer-move');
			$('#game-status').html('Computer move...');
		}

		function unblockPlayer(){
			flag_block_player = false;
			$('#computer-field').removeClass('block-player');
			$('#game-status').removeClass('computer-move');
			$('#game-status').html('Your move');
		}

		function stepComputer(){
			setTimeout(function(){
				var td,
					random_num,
					coords,
					exist_flag = false;
				if(computer_strike_variants.length == 0){
					random_num = rand(0, computer_variants_coords.length - 1);
					coords = computer_variants_coords[random_num];
					td = getTD(player_td, coords[0], coords[1]);
					deleteCoordPoint(computer_variants_coords, coords[0], coords[1]);
					setTimeout(function(){
						fire(td, player_td, player_array, true);
					}, 200);
				}
				else{
					random_num = rand(0, computer_strike_variants.length - 1);
					coords = computer_strike_variants[random_num];
					td = getTD(player_td, coords[0], coords[1]);
					deleteCoordPoint(computer_variants_coords, coords[0], coords[1]);
					deleteCoordPoint(computer_strike_variants, coords[0], coords[1]);
					fire(td, player_td, player_array, true);
				}
			}, 300);
		}


		function getTD(array_td, row, cell){
			return $(array_td[row * field_size + cell]);
		}

		function getCords(array_td, td){
			var index = array_td.index(td);
			var row = Math.floor(index/field_size);
			var cell = index - row * field_size;
			return [row, cell];
		}

		function deleteCoordPoint(array, row, cell){
			for (var i = 0; i < array.length; i++) {
				if(array[i][0] == row && array[i][1] == cell){
					array.splice(i, 1);
					break;
				}
			}
		}

		function endGame(){
			setTimeout(function(){
				if(computer_points < player_points){
					score_game[0]++;
					$('body').removeClass('play-game show-main-menu game-win game-losing');
					$('body').addClass('game-win');
				}
				else{
					score_game[1]++;
					$('body').removeClass('play-game show-main-menu game-win game-losing');
					$('body').addClass('game-losing');
				}

				$('#score-game').html(score_game[0] + ' : ' + score_game[1]);
			}, 1000);
		}

	});
})(jQuery)