package com.qrorder.config;

import com.qrorder.entity.Category;
import com.qrorder.entity.MenuItem;
import com.qrorder.entity.OptionGroup;
import com.qrorder.entity.ItemOption;
import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.enums.MenuItemType;
import com.qrorder.entity.enums.TableStatus;
import com.qrorder.entity.enums.OptionGroupType;
import com.qrorder.entity.enums.SelectionType;
import com.qrorder.entity.User;
import com.qrorder.entity.enums.Role;
import com.qrorder.entity.Branch;
import com.qrorder.entity.Province;
import com.qrorder.entity.Reservation;
import com.qrorder.repository.CategoryRepository;
import com.qrorder.repository.MenuItemRepository;
import com.qrorder.repository.OptionGroupRepository;
import com.qrorder.repository.ItemOptionRepository;
import com.qrorder.repository.RestaurantTableRepository;
import com.qrorder.repository.UserRepository;
import com.qrorder.repository.BranchRepository;
import com.qrorder.repository.ProvinceRepository;
import com.qrorder.repository.ReservationRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private final CategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final OptionGroupRepository optionGroupRepository;
    private final ItemOptionRepository itemOptionRepository;
    private final RestaurantTableRepository tableRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final BranchRepository branchRepository;
    private final ProvinceRepository provinceRepository;
    private final ReservationRepository reservationRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Seed default users
        seedUser("admin", Role.ADMIN);
        seedUser("kitchen", Role.KITCHEN);
        seedUser("waiter", Role.WAITER);
        seedUser("cashier", Role.CASHIER);

        // Seed default Province & Branch if empty
        Province defaultProvince;
        if (provinceRepository.count() == 0) {
            defaultProvince = Province.builder()
                    .name("Hồ Chí Minh")
                    .build();
            defaultProvince = provinceRepository.save(defaultProvince);
        } else {
            defaultProvince = provinceRepository.findAll().get(0);
        }

        Branch defaultBranch;
        if (branchRepository.count() == 0) {
            defaultBranch = Branch.builder()
                    .name("Chi nhánh Quận 1")
                    .address("123 Nguyễn Huệ, Quận 1")
                    .phone("0901234567")
                    .province(defaultProvince)
                    .build();
            defaultBranch = branchRepository.save(defaultBranch);
        } else {
            defaultBranch = branchRepository.findAll().get(0);
        }

        // Link any existing tables without branch to defaultBranch
        List<RestaurantTable> orphanedTables = tableRepository.findAll().stream()
                .filter(t -> t.getBranch() == null)
                .toList();
        if (!orphanedTables.isEmpty()) {
            final Branch branchToSet = defaultBranch;
            orphanedTables.forEach(t -> t.setBranch(branchToSet));
            tableRepository.saveAll(orphanedTables);
        }

        // Seed Table 8 if not exists in the default branch
        if (!tableRepository.existsByTableNumberAndBranchId(8, defaultBranch.getId())) {
            RestaurantTable table8 = RestaurantTable.builder()
                    .tableNumber(8)
                    .capacity(4)
                    .qrToken("table-8-token")
                    .tableKey("TB8X92K")
                    .status(TableStatus.EMPTY)
                    .branch(defaultBranch)
                    .build();
            tableRepository.save(table8);
        }

        // Seed other tables for convenience (e.g. 1 to 5) in the default branch
        for (int i = 1; i <= 5; i++) {
            if (!tableRepository.existsByTableNumberAndBranchId(i, defaultBranch.getId())) {
                RestaurantTable table = RestaurantTable.builder()
                        .tableNumber(i)
                        .capacity(4)
                        .qrToken("table-" + i + "-token")
                        .tableKey("TB" + i + "X92K")
                        .status(TableStatus.EMPTY)
                        .branch(defaultBranch)
                        .build();
                 tableRepository.save(table);
            }
        }

        // Migration/Repair: check if any existing tables lack tableKey and seed them
        List<RestaurantTable> allTables = tableRepository.findAll();
        for (RestaurantTable t : allTables) {
            if (t.getTableKey() == null || t.getTableKey().isBlank()) {
                if (t.getTableNumber() == 8) {
                    t.setTableKey("TB8X92K");
                } else if (t.getTableNumber() >= 1 && t.getTableNumber() <= 5) {
                    t.setTableKey("TB" + t.getTableNumber() + "X92K");
                } else {
                    t.setTableKey("TB" + t.getTableNumber() + "X" + java.util.UUID.randomUUID().toString().substring(0, 4));
                }
                tableRepository.save(t);
            }
        }

        // Seed Categories if empty
        if (categoryRepository.count() == 0) {
            Category pizzaCat = Category.builder().name("Pizza").description("Wood-fired pies").build();
            Category burgerCat = Category.builder().name("Burger").description("Stacked & smashed").build();
            Category drinksCat = Category.builder().name("Drinks").description("Crafted cocktails").build();
            Category coffeeCat = Category.builder().name("Coffee").description("Slow-pour bar").build();
            Category dessertCat = Category.builder().name("Dessert").description("Sweet finishes").build();
            Category specialCat = Category.builder().name("Special").description("Chef's specials").build();

            categoryRepository.saveAll(List.of(pizzaCat, burgerCat, drinksCat, coffeeCat, dessertCat, specialCat));
        }

        if (menuItemRepository.count() == 0) {
            Category pizzaCat = categoryRepository.findByName("Pizza").orElse(null);
            Category burgerCat = categoryRepository.findByName("Burger").orElse(null);
            Category drinksCat = categoryRepository.findByName("Drinks").orElse(null);
            Category coffeeCat = categoryRepository.findByName("Coffee").orElse(null);
            Category dessertCat = categoryRepository.findByName("Dessert").orElse(null);
            Category specialCat = categoryRepository.findByName("Special").orElse(null);

            // Pizza Margherita Reserva
            MenuItem pizza1 = MenuItem.builder()
                    .name("Margherita Reserva")
                    .price(18.0)
                    .description("San Marzano tomato, fior di latte, basil, extra virgin olive oil.")
                    .imageUrl("pizza")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(pizzaCat)
                    .build();
            pizza1 = menuItemRepository.save(pizza1);

            // Option Group: Size (SINGLE, REQUIRED)
            OptionGroup sizeGroup = OptionGroup.builder()
                    .name("Size")
                    .type(OptionGroupType.SIZE)
                    .selectionType(SelectionType.SINGLE)
                    .required(true)
                    .minSelect(1)
                    .maxSelect(1)
                    .displayOrder(1)
                    .available(true)
                    .deleted(false)
                    .menuItem(pizza1)
                    .build();
            sizeGroup = optionGroupRepository.save(sizeGroup);

            itemOptionRepository.save(ItemOption.builder().optionGroup(sizeGroup).optionCode("SIZE_S").name("Small").price(0.0).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(sizeGroup).optionCode("SIZE_M").name("Medium").price(3.0).displayOrder(2).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(sizeGroup).optionCode("SIZE_L").name("Large").price(5.0).displayOrder(3).available(true).deleted(false).build());

            // Option Group: Toppings (MULTIPLE, OPTIONAL, MAX 3)
            OptionGroup toppingsGroup = OptionGroup.builder()
                    .name("Toppings")
                    .type(OptionGroupType.TOPPING)
                    .selectionType(SelectionType.MULTIPLE)
                    .required(false)
                    .minSelect(0)
                    .maxSelect(3)
                    .displayOrder(2)
                    .available(true)
                    .deleted(false)
                    .menuItem(pizza1)
                    .build();
            toppingsGroup = optionGroupRepository.save(toppingsGroup);

            itemOptionRepository.save(ItemOption.builder().optionGroup(toppingsGroup).optionCode("TOPPING_CHEESE").name("Cheese").price(2.0).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(toppingsGroup).optionCode("TOPPING_BACON").name("Bacon").price(2.5).displayOrder(2).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(toppingsGroup).optionCode("TOPPING_MUSHROOM").name("Mushroom").price(1.5).displayOrder(3).available(true).deleted(false).build());

            // Truffle Funghi
            MenuItem pizza2 = MenuItem.builder()
                    .name("Truffle Funghi")
                    .price(22.0)
                    .description("Wild mushrooms, mozzarella, black truffle oil, thyme.")
                    .imageUrl("pizza")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(pizzaCat)
                    .build();
            menuItemRepository.save(pizza2);

            // Burger
            MenuItem burger1 = MenuItem.builder()
                    .name("Wagyu Smash")
                    .price(24.0)
                    .description("Double wagyu patty, aged cheddar, caramelized onion, brioche.")
                    .imageUrl("burger")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(burgerCat)
                    .build();
            menuItemRepository.save(burger1);

            MenuItem burger2 = MenuItem.builder()
                    .name("Smoky BBQ Stack")
                    .price(21.0)
                    .description("Bacon, smoked gouda, crispy onions, bourbon BBQ glaze.")
                    .imageUrl("burger")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(burgerCat)
                    .build();
            menuItemRepository.save(burger2);

            // Drinks
            MenuItem drink1 = MenuItem.builder()
                    .name("Garden Mojito")
                    .price(12.0)
                    .description("White rum, fresh mint, lime, cane sugar, sparkling water.")
                    .imageUrl("drink")
                    .available(true)
                    .type(MenuItemType.INSTANT)
                    .category(drinksCat)
                    .build();
            drink1 = menuItemRepository.save(drink1);

            OptionGroup drinkCustom = OptionGroup.builder()
                    .name("Customizations")
                    .type(OptionGroupType.CUSTOM)
                    .selectionType(SelectionType.MULTIPLE)
                    .required(false)
                    .minSelect(0)
                    .maxSelect(2)
                    .displayOrder(1)
                    .available(true)
                    .deleted(false)
                    .menuItem(drink1)
                    .build();
            drinkCustom = optionGroupRepository.save(drinkCustom);

            itemOptionRepository.save(ItemOption.builder().optionGroup(drinkCustom).optionCode("ADDON_EXTRA_MINT").name("Extra Mint").price(0.5).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(drinkCustom).optionCode("ADDON_EXTRA_LIME").name("Extra Lime").price(0.5).displayOrder(2).available(true).deleted(false).build());

            MenuItem drink2 = MenuItem.builder()
                    .name("Yuzu Spritz")
                    .price(14.0)
                    .description("Prosecco, yuzu, elderflower, soda, fresh citrus.")
                    .imageUrl("drink")
                    .available(false)
                    .type(MenuItemType.INSTANT)
                    .category(drinksCat)
                    .build();
            menuItemRepository.save(drink2);

            // Coffee
            MenuItem coffee1 = MenuItem.builder()
                    .name("Velvet Latte")
                    .price(6.0)
                    .description("Double shot espresso, silky steamed milk, light foam art.")
                    .imageUrl("coffee")
                    .available(true)
                    .type(MenuItemType.INSTANT)
                    .category(coffeeCat)
                    .build();
            coffee1 = menuItemRepository.save(coffee1);

            OptionGroup coffeeCustom = OptionGroup.builder()
                    .name("Customizations")
                    .type(OptionGroupType.CUSTOM)
                    .selectionType(SelectionType.MULTIPLE)
                    .required(false)
                    .minSelect(0)
                    .maxSelect(2)
                    .displayOrder(1)
                    .available(true)
                    .deleted(false)
                    .menuItem(coffee1)
                    .build();
            coffeeCustom = optionGroupRepository.save(coffeeCustom);

            itemOptionRepository.save(ItemOption.builder().optionGroup(coffeeCustom).optionCode("ADDON_OAT_MILK").name("Oat Milk").price(1.0).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(coffeeCustom).optionCode("ADDON_EXTRA_SHOT").name("Extra Espresso Shot").price(1.5).displayOrder(2).available(true).deleted(false).build());

            MenuItem coffee2 = MenuItem.builder()
                    .name("Iced Mocha Noir")
                    .price(7.0)
                    .description("Cold brew, dark chocolate, oat milk, vanilla.")
                    .imageUrl("coffee")
                    .available(true)
                    .type(MenuItemType.INSTANT)
                    .category(coffeeCat)
                    .build();
            menuItemRepository.save(coffee2);

            // Dessert
            MenuItem dessert1 = MenuItem.builder()
                    .name("Molten Chocolate")
                    .price(11.0)
                    .description("Warm chocolate fondant, vanilla bean ice cream, fresh berries.")
                    .imageUrl("dessert")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(dessertCat)
                    .build();
            menuItemRepository.save(dessert1);

            MenuItem dessert2 = MenuItem.builder()
                    .name("Tiramisu Classico")
                    .price(10.0)
                    .description("Espresso-soaked savoiardi, cocoa dust.")
                    .imageUrl("dessert")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(dessertCat)
                    .build();
            menuItemRepository.save(dessert2);

            // Special - Wagyu Tenderloin
            MenuItem special1 = MenuItem.builder()
                    .name("Wagyu Tenderloin")
                    .price(58.0)
                    .description("Grade A5 wagyu, herb butter, charred asparagus, truffle mash.")
                    .imageUrl("special")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(specialCat)
                    .build();
            special1 = menuItemRepository.save(special1);

            // Option Group: Cooking Level (SINGLE, REQUIRED)
            OptionGroup cookingGroup = OptionGroup.builder()
                    .name("Cooking Level")
                    .type(OptionGroupType.COOKING_LEVEL)
                    .selectionType(SelectionType.SINGLE)
                    .required(true)
                    .minSelect(1)
                    .maxSelect(1)
                    .displayOrder(1)
                    .available(true)
                    .deleted(false)
                    .menuItem(special1)
                    .build();
            cookingGroup = optionGroupRepository.save(cookingGroup);

            itemOptionRepository.save(ItemOption.builder().optionGroup(cookingGroup).optionCode("COOK_RARE").name("Rare").price(0.0).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(cookingGroup).optionCode("COOK_MEDIUM_RARE").name("Medium Rare").price(0.0).displayOrder(2).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(cookingGroup).optionCode("COOK_MEDIUM").name("Medium").price(0.0).displayOrder(3).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(cookingGroup).optionCode("COOK_WELL_DONE").name("Well Done").price(0.0).displayOrder(4).available(true).deleted(false).build());

            MenuItem special2 = MenuItem.builder()
                    .name("Seared Scallops")
                    .price(38.0)
                    .description("Pan-seared scallops, cauliflower purée, brown butter caviar.")
                    .imageUrl("special")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(specialCat)
                    .build();
            menuItemRepository.save(special2);
        }

        // Repair/Migration: generate reservation codes & slots for any BOOKED reservations that don't have them
        List<Reservation> bookedWithoutCode = reservationRepository.findAll().stream()
                .filter(r -> r.getStatus() == com.qrorder.entity.enums.ReservationStatus.BOOKED 
                        && (r.getReservationCode() == null || r.getReservationCode().isBlank()))
                .toList();
        for (Reservation r : bookedWithoutCode) {
            String code;
            do {
                code = "RB-" + String.format("%06d", java.util.concurrent.ThreadLocalRandom.current().nextInt(100000, 1000000));
            } while (reservationRepository.findByReservationCode(code).isPresent());
            r.setReservationCode(code);
            if (r.getTimeSlotStart() == null) {
                r.setTimeSlotStart(r.getReservationTime());
            }
            if (r.getTimeSlotEnd() == null) {
                r.setTimeSlotEnd(r.getReservationTime().plusHours(2));
            }
            reservationRepository.save(r);
        }
    }

    private void seedUser(String username, com.qrorder.entity.enums.Role role) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            userRepository.save(User.builder()
                    .username(username)
                    .password(passwordEncoder.encode(username))
                    .role(role)
                    .build());
        } else {
            user.setPassword(passwordEncoder.encode(username));
            user.setRole(role);
            userRepository.save(user);
        }
    }
}
