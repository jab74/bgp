(function() {
	'use strict';

	var app = angular.module('app');

	app.controller('OrderMgmtController', controller);
	
	controller.$inject = [
		'$q', 'args', '$scope', '$modalInstance',
		'$http', '$rootScope',
		'customerMgmt', 'popcornMgmt', 'optionsMgmt',
		'clientConfig'
	];

	function controller(
		$q, args, $scope, $modalInstance, $http, $rootScope,
		customerMgmt, popcornMgmt, optionsMgmt, clientConfig
	) {

		if(args && args.flavor && args.flavor.id) {
			popcornMgmt.getPopcornById(args.flavor.id).then(function(popcornData) {
				$scope.flavor = popcornData[0];
				$scope.flavorImgSrc = "/images/popcorn_images/" + popcornData[0].name.toLowerCase().replace('\'', '').replace('&', 'and').replace(/ /g, '_') + ".jpg";
				optionsMgmt.getOptionsByPopcornId($scope.flavor.id).then(function(sizesData) {
					$scope.flavor.options = sizesData;
				});
			});
		}

		$scope.item = args.item;
		$scope.thing = args.thing;
		$scope.bev = args.bev;
		$scope.bevThing = args.bevThing;
		$scope.specInst = '';
		$scope.quantity = 1;
		$scope.selOption = '';

		$scope.currentlyAvailable = true;
		$scope.currentlyAvailableReason = 'na';

		$scope.holiday = false;

		if(clientConfig.holiday) {
			$scope.currentlyAvailable = false;
			$scope.currentlyAvailableReason = 'holiday';
			return;
		}
		
		$scope.orderCompleted = false;

		// If there's only one option, auto-choose it
		if($scope.flavor && $scope.flavor.options && $scope.flavor.options.length === 1) {
			$scope.selOption = _.first($scope.flavor.options).id;
		}

		$scope.addFlavorOption = function() {
			var sessionPromise = customerMgmt.getSession();
		
			sessionPromise.then(function(sessionData) {

				function mergeThings(existingThing, thingToMerge) {
					existingThing.quantity = (
						parseInt(existingThing.quantity) + parseInt(thingToMerge.quantity)
					);

					var specInst = [];
					existingThing.specInst && specInst.push(existingThing.specInst);
					thingToMerge.specInst && specInst.push(thingToMerge.specInst);
					existingThing.specInst = specInst.join('; ');
				}

				function buildThings(existingThings) {
					existingThings || (existingThings = []);

					var selectedOption;
					$scope.flavor.options.forEach(function(option) {
						if($scope.selOption.localeCompare(option.id)) return;
						selectedOption = option;
					});

					var deferred = $q.defer();

					newThing(selectedOption).then(function(thingToAdd) {
						var isDuplicate = false;
						existingThings.forEach(function(existingThing) {
							if(existingThing.optionId.localeCompare(thingToAdd.optionId)) return;
							isDuplicate = true;
							mergeThings(existingThing, thingToAdd);
						});

						if(! isDuplicate) {
							existingThings.push(thingToAdd);
						}

						deferred.resolve(existingThings);
					}).catch(deferred.reject);

					return deferred.promise;
				}

				function newThing(option) {
					var deferred = $q.defer();

					var p = $scope.getCategory(option.id);
					
					p.then(function(data) {
						var thing = {
							name: $scope.flavor.name,
							option: option.name,
							optionId: option.id,
							price: option.price,
							quantity: $scope.quantity,
							specInst: $scope.specInst,
							category: data.name
						};

						deferred.resolve(thing);
					});

					p.catch(deferred.reject);

					return deferred.promise;
				}

				function buildOrder(order) {
					var deferred = $q.defer();

					if(! order.orderStatus) {
						if(sessionData.customerId) {
							order = {
								customerId: sessionData.customerId,
								orderStatus: parseInt(1),
								sessionId: sessionData.sid,
								orphaned: false
							};
						} else {
							order = {
								orderStatus: parseInt(1),
								sessionId: sessionData.sid,
								orphaned: false
							};
						}
					}

					buildThings(order.things).then(function(things) {
						order.things = things;
						deferred.resolve(order);
					}).catch(deferred.reject);

					return deferred.promise;
				}

				var order;
				if(sessionData.order) {
					order	= sessionData.order;
				} else {
					order = {};
				}

				// Controls that prevent an flavor from being added to
				// an order that has achieved order status 5 or more
				if(order.orderStatus && (parseInt(order.orderStatus) > 4)) {
					console.log('attempting to add flavor to completed order...');
					$scope.orderCompleted = true;
					return;
				}

				if(!order.customerId && sessionData.customerId) {
					order.customerId = sessionData.customerId;
				}

				var method = 'post';
				var url = '/orders/create';

				if(order.orderStatus) {
					method = 'put';
					url = '/orders/' + order.id;
				}

				if(!order.sawBevTour) {
					order.sawBevTour = false;
				}

				buildOrder(order).then(function(order) {
					$http[method](url, order).then(function(res) {
						$rootScope.$broadcast('itemAdded');
						$rootScope.$broadcast('orderChanged');
						$modalInstance.dismiss('done');
					}).catch(function(err) {
						console.log('OrderMgmtController: Save order failed - ' + method + ' - ' + url);
						console.error(err);
						$modalInstance.dismiss('cancel');
					});
				});
			});
		};

		// If there's only one bevOption, auto-choose it
		if($scope.bev && $scope.bev.options && $scope.bev.options.length === 1) {
			$scope.selOption = _.first($scope.bev.options).id;
		}

		$scope.addBevOption = function() {

			var sessionPromise = customerMgmt.getSession();
		
			sessionPromise.then(function(sessionData) {

				function mergeBevThings(existingBevThing, bevThingToMerge) {
					existingBevThing.quantity = (
						parseInt(existingBevThing.quantity) + parseInt(bevThingToMerge.quantity)
					);
				}

				function buildBevThings(existingBevThings) {
					existingBevThings || (existingBevThings = []);

					var selectedBevOption;
					$scope.bev.options.forEach(function(bevOption) {
						if($scope.selOption.localeCompare(bevOption.id)) return;
						selectedBevOption = bevOption;
					});

					var deferred = $q.defer();

					newBevThing(selectedBevOption).then(function(bevThingToAdd) {
						var isDuplicate = false;
						existingBevThings.forEach(function(existingBevThing) {
							if(existingBevThing.optionId.localeCompare(bevThingToAdd.optionId)) return;
							isDuplicate = true;
							mergeBevThings(existingBevThing, bevThingToAdd);
						});

						if(! isDuplicate) {
							existingBevThings.push(bevThingToAdd);
						}

						deferred.resolve(existingBevThings);
					}).catch(deferred.reject);

					return deferred.promise;
				}

				function newBevThing(bevOption) {
					var deferred = $q.defer();

					var bevThing = {
						name: $scope.bev.name,
						option: bevOption.name,
						optionId: bevOption.id,
						price: bevOption.price,
						quantity: $scope.quantity,
					};

					deferred.resolve(bevThing);

					return deferred.promise;
				}

				function buildOrder(order) {
					var deferred = $q.defer();

					if(! order.orderStatus) {
						if(sessionData.customerId) {
							order = {
								customerId: sessionData.customerId,
								areaId: $rootScope.areaId,
								orderStatus: parseInt(1),
// TODO: add bevs at some point and delete the 
// sawBevTour attribute here
								sawBevTour: parseInt(1),
								sessionId: sessionData.sid,
								orphaned: false
							};
						} else {
							order = {
								areaId: $rootScope.areaId,
								orderStatus: parseInt(1),
// TODO: add bevs at some point and delete the 
// sawBevTour attribute here
								sawBevTour: parseInt(1),
								sessionId: sessionData.sid,
								orphaned: false
							};
						}
					}

					buildBevThings(order.bevThings).then(function(bevThings) {
						order.bevThings = bevThings;
						deferred.resolve(order);
					}).catch(deferred.reject);

					return deferred.promise;
				}

				var order;
				if(sessionData.order) {
					order	= sessionData.order;
				} else {
					order = {};
				}

				// Controls that prevent a bev from being added to
				// an order that has achieved order status 5 or more
				if(order.orderStatus && (parseInt(order.orderStatus) > 4)) {
					console.log('attempting to add bev to completed order...');
					$scope.orderCompleted = true;
					return;
				}

				if(!order.customerId && sessionData.customerId) {
					order.customerId = sessionData.customerId;
				}

				var method = 'post';
				var url = '/orders/create';

				if(order.orderStatus) {
					method = 'put';
					url = '/orders/' + order.id;
				}

				buildOrder(order).then(function(order) {
					order.sawBevTour = true;

					$http[method](url, order).then(function(res) {
						$rootScope.$broadcast('orderChanged');
						$modalInstance.dismiss('done');
					}).catch(function(err) {
						console.log('OrderMgmtController: Save order failed - ' + method + ' - ' + url);
						console.error(err);
						$modalInstance.dismiss('cancel');
					});
				});
			});
		};

		$scope.removeThing = function() {
			var sessionPromise = customerMgmt.getSession();
		
			sessionPromise.then(function(sessionData) {
				sessionData || (sessionData = {});
				sessionData.order || (sessionData.order = {});
				sessionData.order.things || (sessionData.order.things = []);

				var things = sessionData.order.things;

				var holdingMap = [];

				things.forEach(function(thing) {
					if(!thing.optionId.localeCompare($scope.thing.optionId)) {
						thing.quantity = (parseInt(thing.quantity) - parseInt($scope.quantity));
						if(thing.quantity > 0) {
							holdingMap.push({
								'name': thing.name,
								'option': thing.option,
								'optionId': thing.optionId,
								'price': thing.price,
								'quantity': thing.quantity,
								'specInst': thing.specInst,
								'restaurantName': thing.restaurantName,
								'restaurantId': thing.restaurantId
							});
						}
					} else {
						holdingMap.push({
							'name': thing.name,
							'option': thing.option,
							'optionId': thing.optionId,
							'price': thing.price,
							'quantity': thing.quantity,
							'specInst': thing.specInst,
							'restaurantName': thing.restaurantName,
							'restaurantId': thing.restaurantId
						});
					}
				});
		
				sessionData.order.things = holdingMap;
		
				var r = $http.put('/orders/' + sessionData.order.id, sessionData.order);
		
				// if orders ajax fails...
				r.catch(function(err) {
					console.log('OrderMgmtController: removeOption-put ajax failed');
					console.error(err);
					$modalInstance.dismiss('cancel');
				});
							
				// if orders ajax succeeds...
				r.then(function(res) {
					$rootScope.$broadcast('orderChanged');
					$rootScope.$broadcast('itemRemoved');
					$modalInstance.dismiss('done');
				});
			});
		};

		$scope.removeBevThing = function() {

			var sessionPromise = customerMgmt.getSession();
		
			sessionPromise.then(function(sessionData) {
				sessionData || (sessionData = {});
				sessionData.order || (sessionData.order = {});
				sessionData.order.bevThings || (sessionData.order.bevThings = []);

				var bevThings = sessionData.order.bevThings;

				var holdingMap = [];

				bevThings.forEach(function(bevThing) {
					if(!bevThing.optionId.localeCompare($scope.bevThing.optionId)) {
						bevThing.quantity = (parseInt(bevThing.quantity) - parseInt($scope.quantity));
						if(bevThing.quantity > 0) {
							holdingMap.push({
								'name': bevThing.name,
								'option': bevThing.option,
								'optionId': bevThing.optionId,
								'price': bevThing.price,
								'quantity': bevThing.quantity,
								'specInst': bevThing.specInst,
								'restaurantName': bevThing.restaurantName,
								'restaurantId': bevThing.restaurantId
							});
						}
					} else {
						holdingMap.push({
							'name': bevThing.name,
							'option': bevThing.option,
							'optionId': bevThing.optionId,
							'price': bevThing.price,
							'quantity': bevThing.quantity,
							'specInst': bevThing.specInst,
							'restaurantName': bevThing.restaurantName,
							'restaurantId': bevThing.restaurantId
						});
					}
				});
		
				sessionData.order.bevThings = holdingMap;
		
				var r = $http.put('/orders/' + sessionData.order.id, sessionData.order);
		
				// if orders ajax fails...
				r.catch(function(err) {
					console.log('OrderMgmtController: removeOption-put ajax failed');
					console.error(err);
					$modalInstance.dismiss('cancel');
				});
							
				// if orders ajax succeeds...
				r.then(function(res) {
					$rootScope.$broadcast('orderChanged');
					$modalInstance.dismiss('done');
				});
			});
		};

		$scope.getCategory = function(optionId) {
			return $q(function(resolve, reject) {
				var r = $http.get('/options/' + optionId);
					
				r.error(function(err) {
					console.log('OrderMgmtController: getCategory-options ajax failed');
					console.error(err);
					reject(err);
				});
					
				r.then(function(res) {
					var s = $http.get('/popcorn/' + res.data.popcornId);
						
					s.error(function(err) {
						console.log('OrderMgmtController: getCategory-popcorn ajax failed');
						console.error(err);
						reject(err);
					});
						
					s.then(function(res) {
						var t = $http.get('/categories/' + res.data.category);
							
						t.error(function(err) {
							console.log('OrderMgmtController: getCategory-category ajax failed');
							console.error(err);
							reject(err);
						});
							
						t.then(function(res) {
							resolve(res.data);
						});
					});
				});
			});
		}
	}

}());
