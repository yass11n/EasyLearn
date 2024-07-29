/**
 * @ignore things i might need latter 
 */
/* exports.applyCoupon = asyncHandler(async (req, res, next) => {
//   // 1) Get coupon based on coupon name
//   const coupon = await Coupon.findOne({
//     name: req.body.coupon,
//     expire: { $gt: Date.now() },
//   });

//   if (!coupon) {
//     return next(new recordNotFound(`Coupon is invalid or expired`));
//   }

//   // 2) Get logged user cart to get total cart price
//   const cart = await Cart.findOne({ user: req.user._id });

//   const totalPrice = cart.totalCartPrice;

//   // 3) Calculate price after priceAfterDiscount
//   const totalPriceAfterDiscount = (
//     totalPrice -
//     (totalPrice * coupon.discount) / 100
//   ).toFixed(2); // 99.23

//   cart.totalPriceAfterDiscount = totalPriceAfterDiscount;
//   await cart.save();

//   res.status(200).json({
//     status: 'success',
//     numOfCartItems: cart.cartItems.length,
//     data: cart,
//   });
// });*/

// the below code fragment can be found in: get looged user cart before modification
// const getLoggedUserCart = asyncHandler(async (req, res) => {
//     // 1. Find the cart for the logged-in user
//     const cart = await Cart.findOne({ user: req.user._id });
  
//     // 2. Check if cart exists
//     if (!cart) {
//       // If cart does not exist, return a 404 error using recordNotFound
//       return recordNotFound({
//         message: `There is no cart for this user id: ${req.user._id}`,
//       });
//     }
  
//     // 3. Check if cartItems array is empty
//     if (cart.cartItems.length === 0) {
//       // If cart exists but cartItems is empty, return a success response indicating an empty cart
//       const { body, statusCode } = success({
//         message: "Cart is empty",
//         data: {
//           numOfCartItems: cart.cartItems.length,
//           data: cart,
//         },
//       });
//       return res.status(statusCode).json(body);
//     }
  
//     // 4. If cart and cartItems exist, create a success response body
//     const { body, statusCode } = success({
//       data: {
//         numOfCartItems: cart.cartItems.length,
//         data: cart,
//       },
//     });
  
//     // 5. Send the success response
//     res.status(statusCode).json(body);
//   });

/*const calcTotalCartPrice = (cart) => {
  let totalPrice = 0;

  cart.cartItems.forEach((item) => {
    // Check if item.price is a valid number
    if (typeof item.price === "number" && !isNaN(item.price)) {
      totalPrice += item.price;
    } else {
      console.error("Invalid price for cart item:", item);
    }
  });
  cart.totalCartPrice = totalPrice;
  cart.totalPriceAfterDiscount = undefined;
  return totalPrice;
}; */

/* // 1- Find the category by ID and populate the 'courses' field to get course details
// const categoryWithCourses = await Category.findById(req.params.categoryId).populate('courses');

// // 2- check if categoryWithCourses exists
// if (!categoryWithCourses) {
//   return next(recordNotFound({ message: `Catogory not found` }))
// }

/// 3- Extract courses from the populated field
// const coursesInCategory = categoryWithCourses.courses;

// // 4- get response back
// const { statusCode, body } = success({
//   message: 'categoryCourses:',
//   data: coursesInCategory
// });
// res.status(statusCode).json(body);*/
//  // Update Modules within Sections for the approved course
    //  const sections = await Section.find({ courseId }); // Find sections for the course

    //  for (const section of sections) {
    //    const moduleIds = section.modules; // Get module IDs within the section
 
    //    for (const moduleId of moduleIds) {
    //       await Module.findByIdAndUpdate( moduleId , {isFree : true}); // Update all modules to isFree: true
    //    }
    //  }











    const instrucotrId = req.body.instrucotrid;
    const instructor = await User.findById(instrucotrId);

    // check if instructor exists
    if (!instructor) {
      return res.status(404).json({ message: "instructor not found" });
    }
    // get user enrolled in all of his courses, and ratings
    let totalUserEnrolled = 0
    let sumOfCoursesRating = 0
    let totalPublishedCourses = 0;
    // get a map through each course and get the id, title, thumbnail, price, ratingsAvaerage, profits, and instructorName
    const formattedCourses = [];
    for (const courseId of instructor.courses) {
      console.log("courseId " + courseId)
      // get course by id
      const course = await Course.findById(courseId)
      if (course) {
        // get the length of no.of students
        totalUserEnrolled += course.enrolledUsers.length;
        //get rating of each course
        if (course.ratingsAverage > 2 && course.publish == true) {
          console.log("gowa");
          sumOfCoursesRating += course.ratingsAverage;
          console.log(sumOfCoursesRating + "sumTEXTAGAGAGGAGGGGGGGGGGGGGGGGGGGGGGG");
          totalPublishedCourses++;
        }
        if (course.publish == true) {
          formattedCourses.push({
            _id: course._id,
            title: course.title,
            thumbnail: course.thumbnail,
            price: course.price,
            ratingsAverage: course.ratingsAverage || 0,
            instructorName: course.instructor.name,
            profits: course.profits || 0
          });
        }
      }
      console.log(totalUserEnrolled)
    }
    



    exports.getUser = asyncHandler(async (req, res, next) => {
      try {
        
        // check if instructor exists
        if (!instructor) {
          return res.status(404).json({ message: "instructor not found" });
        }
        // get user enrolled in all of his courses, and ratings
        let totalUserEnrolled = 0;
        let sumOfCoursesRating = 0;
        let totalPublishedCourses = 0;
    
        for (const courseId of instructor.courses) {
          console.log("courseId " + courseId);
          // get course by id
          const course = await Course.findById(courseId);
          if (course) {
            // get the length of no.of students
            totalUserEnrolled += course.enrolledUsers.length;
            //get rating of each course
            if (course.ratingsAverage > 2 && course.publish == true) {
              console.log("gowa");
              sumOfCoursesRating += course.ratingsAverage;
              console.log(
                sumOfCoursesRating + "sumTEXTAGAGAGGAGGGGGGGGGGGGGGGGGGGGGGG"
              );
              totalPublishedCourses++;
            }
          }
          console.log(totalUserEnrolled);
        }
        let ratings = 0;
        // calculate average rating
        if (sumOfCoursesRating > 0) {
          ratings = sumOfCoursesRating / totalPublishedCourses;
          console.log("ratings: ", ratings);
        }
        // create object with the required instrucotor's data
        const instructorProfileData = {
          profile: instructor.profileImage,
          name: instructor.name,
          email: instructor.email,
          jobTitle: instructor.jobTitle,
          jobDescription: instructor.jobDescription,
          linkedinUrl: instructor.linkedinUrl,
          enrolledUsers: totalUserEnrolled,
          ratings: ratings,
        };
    
        // Send the response back
        const { statusCode, body } = success({
          message: "here's the instcuror's profile",
          data: { results: instructorProfileData },
        });
        res.status(statusCode).json(body);
      } catch (err) {
        console.log(err);
        next(err);
      }
    });