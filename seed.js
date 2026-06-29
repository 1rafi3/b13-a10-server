import Recipe from "./models/Recipe.js";
import User from "./models/User.js";

export async function seedDatabase() {
  try {
    const count = await Recipe.countDocuments();
    if (count > 0) {
      console.log("Database already contains recipes. Skipping seeding.");
      return;
    }

    console.log("Seeding initial recipes database...");

    // Create a default admin user if not exists to act as the seed author
    let seedAuthor = await User.findOne({ email: "admin@recipehub.com" });
    if (!seedAuthor) {
      seedAuthor = await User.create({
        name: "Chef Culinary",
        email: "admin@recipehub.com",
        image: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150",
        role: "admin",
        isBlocked: false,
        isPremium: true
      });
      console.log("Default admin/seed user created: admin@recipehub.com");
    }

    const defaultRecipes = [
      {
        recipeName: "Classic Italian Lasagna",
        recipeImage: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800",
        category: "Dinner",
        cuisineType: "Italian",
        difficultyLevel: "Medium",
        preparationTime: 75,
        ingredients: [
          "12 lasagna noodles",
          "1 lb sweet Italian sausage",
          "3/4 lb lean ground beef",
          "1/2 cup minced onion",
          "2 cloves garlic, crushed",
          "1 can (28 ounces) crushed tomatoes",
          "2 cans (6 ounces each) tomato paste",
          "2 cans (6.5 ounces each) canned tomato sauce",
          "1/2 cup water",
          "15 oz ricotta cheese",
          "1 egg",
          "3/4 lb mozzarella cheese, sliced",
          "3/4 cup grated Parmesan cheese"
        ],
        instructions: [
          "In a Dutch oven, cook sausage, ground beef, onion, and garlic over medium heat until well browned.",
          "Stir in crushed tomatoes, tomato paste, tomato sauce, and water. Season with sugar, fresh herbs, salt, and pepper.",
          "Simmer, covered, for about 1 1/2 hours, stirring occasionally.",
          "Bring a large pot of lightly salted water to a boil. Cook lasagna noodles in boiling water for 8 to 10 minutes. Drain noodles, and rinse with cold water.",
          "In a mixing bowl, combine ricotta cheese with egg, remaining parsley, and 1/2 teaspoon salt.",
          "Preheat oven to 375 degrees F (190 degrees C).",
          "To assemble, spread 1 1/2 cups of meat sauce in the bottom of a 9x13-inch baking dish. Arrange 6 noodles lengthwise over meat sauce. Spread with one half of the ricotta cheese mixture. Top with a third of mozzarella cheese slices.",
          "Spoon 1 1/2 cups meat sauce over mozzarella, and sprinkle with 1/4 cup Parmesan cheese. Repeat layers, and top with remaining mozzarella and Parmesan cheese. Cover with foil: to prevent sticking, either spray foil with cooking spray, or make sure the foil does not touch the cheese.",
          "Bake in preheated oven for 25 minutes. Remove foil, and bake an additional 25 minutes. Cool for 15 minutes before serving."
        ],
        authorId: seedAuthor._id.toString(),
        authorName: seedAuthor.name,
        authorEmail: seedAuthor.email,
        likesCount: 154,
        isFeatured: true,
        status: "active",
        price: 0
      },
      {
        recipeName: "Spicy Thai Green Curry",
        recipeImage: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800",
        category: "Lunch",
        cuisineType: "Thai",
        difficultyLevel: "Medium",
        preparationTime: 30,
        ingredients: [
          "2 tbsp green curry paste",
          "1 tbsp vegetable oil",
          "400ml coconut milk",
          "2 chicken breasts, thinly sliced",
          "1 tbsp fish sauce",
          "1 tsp brown sugar",
          "100g bamboo shoots",
          "50g green peas",
          "Handful of fresh Thai basil leaves",
          "1 red chili, sliced for garnish"
        ],
        instructions: [
          "Heat the vegetable oil in a large wok or deep skillet over medium heat.",
          "Add the green curry paste and fry for about 1-2 minutes until fragrant.",
          "Pour in half of the coconut milk and stir until the oil begins to separate.",
          "Add the sliced chicken breasts and cook for 3-4 minutes until the meat turns white.",
          "Add the remaining coconut milk, bamboo shoots, green peas, fish sauce, and brown sugar. Bring to a simmer and cook for 10 minutes.",
          "Stir in the Thai basil leaves and remove from heat.",
          "Garnish with sliced red chili and serve hot with steamed Jasmine rice."
        ],
        authorId: seedAuthor._id.toString(),
        authorName: seedAuthor.name,
        authorEmail: seedAuthor.email,
        likesCount: 92,
        isFeatured: false,
        status: "active",
        price: 0
      },
      {
        recipeName: "Chocolate Lava Cake",
        recipeImage: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800",
        category: "Dessert",
        cuisineType: "French",
        difficultyLevel: "Hard",
        preparationTime: 25,
        ingredients: [
          "100g high-quality dark chocolate (70% cocoa)",
          "100g unsalted butter",
          "2 large eggs",
          "2 egg yolks",
          "50g caster sugar",
          "50g plain flour",
          "Butter and cocoa powder for ramekins"
        ],
        instructions: [
          "Preheat oven to 200 degrees C (390 degrees F). Grease 4 ramekins with butter and dust lightly with cocoa powder.",
          "Melt the dark chocolate and butter together in a heatproof bowl set over a saucepan of simmering water, stirring occasionally until smooth. Let cool slightly.",
          "In a separate bowl, whisk eggs, egg yolks, and sugar together until thick and pale.",
          "Gently fold the melted chocolate mixture and plain flour into the egg mixture until combined.",
          "Divide the batter evenly among the prepared ramekins.",
          "Bake in the preheated oven for 10-12 minutes. The edges should be firm but the center should still wobble slightly.",
          "Let stand for 1 minute, then gently invert each ramekin onto a plate and serve immediately with vanilla ice cream."
        ],
        authorId: seedAuthor._id.toString(),
        authorName: seedAuthor.name,
        authorEmail: seedAuthor.email,
        likesCount: 210,
        isFeatured: true,
        status: "active",
        price: 0
      },
      {
        recipeName: "Avocado Sourdough Toast",
        recipeImage: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800",
        category: "Breakfast",
        cuisineType: "American",
        difficultyLevel: "Easy",
        preparationTime: 15,
        ingredients: [
          "2 slices sourdough bread",
          "1 ripe Haas avocado",
          "1 tbsp lemon juice",
          "1/2 tsp red pepper flakes",
          "1 tbsp extra virgin olive oil",
          "Coarse sea salt and freshly cracked black pepper",
          "Microgreens for garnish"
        ],
        instructions: [
          "Toast the sourdough bread slices to your desired level of crispiness.",
          "While toast is warm, cut the avocado in half, remove the pit, and scoop the flesh into a bowl.",
          "Mash the avocado using a fork, leaving some chunks for texture. Mix in the lemon juice and a pinch of salt.",
          "Spread the mashed avocado evenly over the toasted sourdough slices.",
          "Drizzle with olive oil and sprinkle red pepper flakes, black pepper, and coarse sea salt.",
          "Top with microgreens and serve immediately."
        ],
        authorId: seedAuthor._id.toString(),
        authorName: seedAuthor.name,
        authorEmail: seedAuthor.email,
        likesCount: 83,
        isFeatured: false,
        status: "active",
        price: 0
      },
      {
        recipeName: "Premium Garlic Butter Shrimp",
        recipeImage: "https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=800",
        category: "Dinner",
        cuisineType: "Spanish",
        difficultyLevel: "Easy",
        preparationTime: 20,
        ingredients: [
          "1 lb jumbo shrimp, peeled and deveined",
          "4 tbsp unsalted butter",
          "5 cloves garlic, minced",
          "1/4 cup dry white wine or chicken broth",
          "1 tbsp lemon juice",
          "2 tbsp fresh parsley, chopped",
          "1/4 tsp lemon zest",
          "Salt and black pepper to taste"
        ],
        instructions: [
          "Season the shrimp with salt and pepper on both sides.",
          "Melt 2 tablespoons of butter in a large skillet over medium-high heat. Add the shrimp in a single layer and sear for 1-2 minutes until pink. Flip and cook for another minute. Remove shrimp from skillet and set aside.",
          "Add the remaining 2 tablespoons of butter and the minced garlic to the skillet. Cook for 1 minute until fragrant.",
          "Pour in the white wine (or broth) and lemon juice. Simmer and let reduce by half, about 2 minutes.",
          "Return the shrimp to the skillet. Toss to coat in the garlic butter sauce.",
          "Stir in chopped parsley and lemon zest, then serve immediately."
        ],
        authorId: seedAuthor._id.toString(),
        authorName: seedAuthor.name,
        authorEmail: seedAuthor.email,
        likesCount: 145,
        isFeatured: true,
        status: "active",
        price: 4.99 // Premium recipe
      },
      {
        recipeName: "Japanese Matcha Souffle Pancakes",
        recipeImage: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800",
        category: "Breakfast",
        cuisineType: "Japanese",
        difficultyLevel: "Hard",
        preparationTime: 30,
        ingredients: [
          "2 large egg yolks",
          "1 tbsp whole milk",
          "1/2 tsp vanilla extract",
          "30g cake flour",
          "1 tbsp culinary-grade matcha powder",
          "1/2 tsp baking powder",
          "3 large egg whites",
          "30g sugar",
          "Powdered sugar and maple syrup for serving"
        ],
        instructions: [
          "In a bowl, whisk egg yolks, milk, and vanilla extract until smooth. Sift in the cake flour, matcha powder, and baking powder. Whisk gently until combined.",
          "In a separate clean glass bowl, whisk the egg whites using an electric mixer until frothy. Gradually add sugar one tablespoon at a time and whisk until stiff peaks form.",
          "Gently fold one-third of the egg white meringue into the matcha batter until combined, then fold in the remaining meringue. Be careful not to deflate the batter.",
          "Heat a non-stick pan on low heat and lightly grease it with oil.",
          "Scoop large mounds of batter onto the pan. Add 1 teaspoon of water to the pan corners, cover with a lid, and cook for 4-5 minutes.",
          "Carefully flip the pancakes, add another teaspoon of water, cover, and cook for 4 more minutes until cooked through and bouncy.",
          "Serve warm with a dusting of powdered sugar, fresh berries, and maple syrup."
        ],
        authorId: seedAuthor._id.toString(),
        authorName: seedAuthor.name,
        authorEmail: seedAuthor.email,
        likesCount: 189,
        isFeatured: false,
        status: "active",
        price: 2.99 // Premium recipe
      }
    ];

    await Recipe.insertMany(defaultRecipes);
    console.log("Recipes database seeded successfully with 6 default recipes.");
  } catch (err) {
    console.error("Error seeding database:", err);
  }
}
