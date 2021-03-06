(function() {
	'use strict';

	var app = angular.module('app');

	///
	// Layout Controller
	///


	app.controller('LayoutController', controller);
	
	controller.$inject = [
		'navMgr', 'pod', '$scope',
		'$http', '$routeParams', '$modal', 'layoutMgmt',
		'$rootScope', 'customerMgmt', 'deviceMgr'
	];

	function controller(
		navMgr, pod, $scope,
		$http, $routeParams, $modal, layoutMgmt,
		$rootScope, customerMgmt, deviceMgr
	) {

		if(deviceMgr.isBigScreen()) {
			$scope.bigScreen = true;
		} else {
			$scope.bigScreen = false;
		}

		$scope.showLogin = true;
		$scope.showLogout = false;
		$scope.showSignup = true;

		$scope.showMenu = false;

		$scope.menuClicked = function(forceValue) {
			if(! _.isUndefined(forceValue)) {
				$scope.showMenu = forceValue;
				return;
			}
			$scope.showMenu = !$scope.showMenu;
		}

		$scope.showFeedback = layoutMgmt.feedback;

		$rootScope.$on('customerLoggedIn', onCustomerLoggedIn);

		$scope.accessAccount = false;
		$scope.activeCart = false;

		$scope.showAccount = function() {
			$rootScope.$broadcast('showAccount');
		}

		$scope.showCareers = function() {
			$rootScope.$broadcast('showCareers');
		}

		$scope.showCart = function() {
			$rootScope.$broadcast('showCart');
		}

		$scope.showContact = function() {
			$rootScope.$broadcast('showContact');
		}

		$scope.showPrivacy = function() {
			$rootScope.$broadcast('showPrivacy');
		}

		$scope.showPopcorn = function() {
			$rootScope.$broadcast('showPopcorn');
		}

		$scope.showStory = function() {
			$rootScope.$broadcast('showStory');
		}


		$rootScope.$on('itemAdded', function(evt, customer) {
			$scope.activeCart = true;
			var sessionPromise = customerMgmt.getSession();
			sessionPromise.then(function(sessionData) {
				$scope.cartItemsCount = sessionData.order.things.length;
			});
		});

		$rootScope.$on('orderChanged', function(evt, customer) {
			var sessionPromise = customerMgmt.getSession();
			sessionPromise.then(function(sessionData) {
				if(sessionData.order && sessionData.order.things && sessionData.order.things.length > 0) {
					$scope.activeCart = true;
					$scope.cartItemsCount = sessionData.order.things.length;
				} else {
					$scope.activeCart = false;
				}
			});
		});

		function onCustomerLoggedIn(evt, args) {
			$scope.customerId = args;
			$scope.showLogin = false;
			$scope.showLogout = true;
			$scope.showSignup = false;

			var getCustomerPromise = customerMgmt.getCustomer($scope.customerId);
			getCustomerPromise.then(function(customer) {
				$scope.customer = customer;
			});
		}

		$rootScope.$on('cartEmptied', function(evt, customer) {
			$scope.activeCart = false;
		});

		var sessionPromise = customerMgmt.getSession();

		sessionPromise.then(function(sessionData) {
			if(sessionData.customerId) {
				$rootScope.customerId = sessionData.customerId;
				$scope.customerId = sessionData.customerId;
				$scope.accessAccount = true;
				$scope.showLogin = false;
				$scope.showLogout = true;
				$scope.showSignup = false;
			} else {
				$scope.showLogin = true;
				$scope.showLogout = false;
				$scope.showSignup = true;
			}

			if(sessionData.order && sessionData.order.things && sessionData.order.things.length > 0) {
				$scope.activeCart = true;
				$scope.cartItemsCount = sessionData.order.things.length;
			}

			$scope.logIn = layoutMgmt.logIn;
			$scope.logOut = layoutMgmt.logOut;
			$scope.signUp = layoutMgmt.signUp;
		});

		$rootScope.$on('customerLoggedIn', function(evt, args) {
			$scope.accessAccount = true;
			$scope.customerId = args;
			$rootScope.$broadcast('orderChanged');
		});

	}

}());
