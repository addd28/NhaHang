package com.qrorder.config;

import com.qrorder.entity.*;
import com.qrorder.entity.enums.*;
import com.qrorder.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
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
    private final ReservationRepository reservationRepository;
    private final TableSessionRepository tableSessionRepository;
    private final PaymentRepository paymentRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Seed default users
        seedUser("admin", Role.ADMIN);
        seedUser("kitchen", Role.KITCHEN);
        seedUser("waiter", Role.WAITER);
        seedUser("cashier", Role.CASHIER);

        // Seed Table 8 if not exists
        if (!tableRepository.existsByTableNumber(8)) {
            RestaurantTable table8 = RestaurantTable.builder()
                    .tableNumber(8)
                    .capacity(4)
                    .qrToken("table-8-token")
                    .tableKey("TB8X92K")
                    .status(TableStatus.EMPTY)
                    .build();
            tableRepository.save(table8);
        }

        // Seed tables 1-5 if not exists
        for (int i = 1; i <= 5; i++) {
            if (!tableRepository.existsByTableNumber(i)) {
                RestaurantTable table = RestaurantTable.builder()
                        .tableNumber(i)
                        .capacity(4)
                        .qrToken("table-" + i + "-token")
                        .tableKey("TB" + i + "X92K")
                        .status(TableStatus.EMPTY)
                        .build();
                tableRepository.save(table);
            }
        }

        // Migration/Repair: seed tableKey for any table missing it
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
                    .price(180000.0)
                    .description("San Marzano tomato, fior di latte, basil, extra virgin olive oil.")
                    .imageUrl("pizza")
                    .available(true)
                    .type(MenuItemType.KITCHEN)
                    .category(pizzaCat)
                    .build();
            pizza1 = menuItemRepository.save(pizza1);

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
            itemOptionRepository.save(ItemOption.builder().optionGroup(sizeGroup).optionCode("SIZE_M").name("Medium").price(30000.0).displayOrder(2).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(sizeGroup).optionCode("SIZE_L").name("Large").price(50000.0).displayOrder(3).available(true).deleted(false).build());

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

            itemOptionRepository.save(ItemOption.builder().optionGroup(toppingsGroup).optionCode("TOPPING_CHEESE").name("Cheese").price(20000.0).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(toppingsGroup).optionCode("TOPPING_BACON").name("Bacon").price(25000.0).displayOrder(2).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(toppingsGroup).optionCode("TOPPING_MUSHROOM").name("Mushroom").price(15000.0).displayOrder(3).available(true).deleted(false).build());

            // Truffle Funghi
            menuItemRepository.save(MenuItem.builder().name("Truffle Funghi").price(220000.0)
                    .description("Wild mushrooms, mozzarella, black truffle oil, thyme.")
                    .imageUrl("pizza").available(true).type(MenuItemType.KITCHEN).category(pizzaCat).build());

            // Burgers
            menuItemRepository.save(MenuItem.builder().name("Wagyu Smash").price(240000.0)
                    .description("Double wagyu patty, aged cheddar, caramelized onion, brioche.")
                    .imageUrl("burger").available(true).type(MenuItemType.KITCHEN).category(burgerCat).build());
            menuItemRepository.save(MenuItem.builder().name("Smoky BBQ Stack").price(210000.0)
                    .description("Bacon, smoked gouda, crispy onions, bourbon BBQ glaze.")
                    .imageUrl("burger").available(true).type(MenuItemType.KITCHEN).category(burgerCat).build());

            // Drinks
            MenuItem drink1 = MenuItem.builder().name("Garden Mojito").price(120000.0)
                    .description("White rum, fresh mint, lime, cane sugar, sparkling water.")
                    .imageUrl("drink").available(true).type(MenuItemType.INSTANT).category(drinksCat).build();
            drink1 = menuItemRepository.save(drink1);

            OptionGroup drinkCustom = OptionGroup.builder().name("Customizations").type(OptionGroupType.CUSTOM)
                    .selectionType(SelectionType.MULTIPLE).required(false).minSelect(0).maxSelect(2)
                    .displayOrder(1).available(true).deleted(false).menuItem(drink1).build();
            drinkCustom = optionGroupRepository.save(drinkCustom);
            itemOptionRepository.save(ItemOption.builder().optionGroup(drinkCustom).optionCode("ADDON_EXTRA_MINT").name("Extra Mint").price(5000.0).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(drinkCustom).optionCode("ADDON_EXTRA_LIME").name("Extra Lime").price(5000.0).displayOrder(2).available(true).deleted(false).build());

            menuItemRepository.save(MenuItem.builder().name("Yuzu Spritz").price(140000.0)
                    .description("Prosecco, yuzu, elderflower, soda, fresh citrus.")
                    .imageUrl("drink").available(false).type(MenuItemType.INSTANT).category(drinksCat).build());

            // Coffee
            MenuItem coffee1 = MenuItem.builder().name("Velvet Latte").price(60000.0)
                    .description("Double shot espresso, silky steamed milk, light foam art.")
                    .imageUrl("coffee").available(true).type(MenuItemType.INSTANT).category(coffeeCat).build();
            coffee1 = menuItemRepository.save(coffee1);

            OptionGroup coffeeCustom = OptionGroup.builder().name("Customizations").type(OptionGroupType.CUSTOM)
                    .selectionType(SelectionType.MULTIPLE).required(false).minSelect(0).maxSelect(2)
                    .displayOrder(1).available(true).deleted(false).menuItem(coffee1).build();
            coffeeCustom = optionGroupRepository.save(coffeeCustom);
            itemOptionRepository.save(ItemOption.builder().optionGroup(coffeeCustom).optionCode("ADDON_OAT_MILK").name("Oat Milk").price(10000.0).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(coffeeCustom).optionCode("ADDON_EXTRA_SHOT").name("Extra Espresso Shot").price(15000.0).displayOrder(2).available(true).deleted(false).build());

            menuItemRepository.save(MenuItem.builder().name("Iced Mocha Noir").price(70000.0)
                    .description("Cold brew, dark chocolate, oat milk, vanilla.")
                    .imageUrl("coffee").available(true).type(MenuItemType.INSTANT).category(coffeeCat).build());

            // Desserts
            menuItemRepository.save(MenuItem.builder().name("Molten Chocolate").price(110000.0)
                    .description("Warm chocolate fondant, vanilla bean ice cream, fresh berries.")
                    .imageUrl("dessert").available(true).type(MenuItemType.KITCHEN).category(dessertCat).build());
            menuItemRepository.save(MenuItem.builder().name("Tiramisu Classico").price(100000.0)
                    .description("Espresso-soaked savoiardi, cocoa dust.")
                    .imageUrl("dessert").available(true).type(MenuItemType.KITCHEN).category(dessertCat).build());

            // Specials
            MenuItem special1 = MenuItem.builder().name("Wagyu Tenderloin").price(580000.0)
                    .description("Grade A5 wagyu, herb butter, charred asparagus, truffle mash.")
                    .imageUrl("special").available(true).type(MenuItemType.KITCHEN).category(specialCat).build();
            special1 = menuItemRepository.save(special1);

            OptionGroup cookingGroup = OptionGroup.builder().name("Cooking Level").type(OptionGroupType.COOKING_LEVEL)
                    .selectionType(SelectionType.SINGLE).required(true).minSelect(1).maxSelect(1)
                    .displayOrder(1).available(true).deleted(false).menuItem(special1).build();
            cookingGroup = optionGroupRepository.save(cookingGroup);
            itemOptionRepository.save(ItemOption.builder().optionGroup(cookingGroup).optionCode("COOK_RARE").name("Rare").price(0.0).displayOrder(1).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(cookingGroup).optionCode("COOK_MEDIUM_RARE").name("Medium Rare").price(0.0).displayOrder(2).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(cookingGroup).optionCode("COOK_MEDIUM").name("Medium").price(0.0).displayOrder(3).available(true).deleted(false).build());
            itemOptionRepository.save(ItemOption.builder().optionGroup(cookingGroup).optionCode("COOK_WELL_DONE").name("Well Done").price(0.0).displayOrder(4).available(true).deleted(false).build());

            menuItemRepository.save(MenuItem.builder().name("Seared Scallops").price(380000.0)
                    .description("Pan-seared scallops, cauliflower purée, brown butter caviar.")
                    .imageUrl("special").available(true).type(MenuItemType.KITCHEN).category(specialCat).build());
        }

        // Repair: generate reservation codes for BOOKED reservations missing them
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
            if (r.getTimeSlotStart() == null) r.setTimeSlotStart(r.getReservationTime());
            if (r.getTimeSlotEnd() == null) r.setTimeSlotEnd(r.getReservationTime().plusHours(2));
            reservationRepository.save(r);
        }

        if (paymentRepository.count() == 0) {
            RestaurantTable table1 = tableRepository.findByTableNumber(1).orElse(null);
            RestaurantTable table2 = tableRepository.findByTableNumber(2).orElse(null);
            RestaurantTable table3 = tableRepository.findByTableNumber(3).orElse(null);
            RestaurantTable table4 = tableRepository.findByTableNumber(4).orElse(null);
            RestaurantTable table5 = tableRepository.findByTableNumber(5).orElse(null);

            seedSessionPayment(table1, 8000000.0, PaymentMethod.CASH, LocalDateTime.now().minusDays(6).withHour(12).withMinute(0));
            seedSessionPayment(table2, 4000000.0, PaymentMethod.PAYPAL, LocalDateTime.now().minusDays(6).withHour(18).withMinute(30));
            seedSessionPayment(table3, 500000.0, PaymentMethod.QR, LocalDateTime.now().minusDays(6).withHour(20).withMinute(15));

            seedSessionPayment(table1, 9000000.0, PaymentMethod.CASH, LocalDateTime.now().minusDays(5).withHour(13).withMinute(0));
            seedSessionPayment(table3, 5000000.0, PaymentMethod.PAYPAL, LocalDateTime.now().minusDays(5).withHour(19).withMinute(0));
            seedSessionPayment(table4, 800000.0, PaymentMethod.QR, LocalDateTime.now().minusDays(5).withHour(21).withMinute(0));

            seedSessionPayment(table2, 7500000.0, PaymentMethod.CASH, LocalDateTime.now().minusDays(4).withHour(12).withMinute(30));
            seedSessionPayment(table4, 4500000.0, PaymentMethod.PAYPAL, LocalDateTime.now().minusDays(4).withHour(18).withMinute(0));
            seedSessionPayment(table5, 700000.0, PaymentMethod.QR, LocalDateTime.now().minusDays(4).withHour(19).withMinute(30));

            seedSessionPayment(table1, 10000000.0, PaymentMethod.CASH, LocalDateTime.now().minusDays(3).withHour(13).withMinute(30));
            seedSessionPayment(table3, 6000000.0, PaymentMethod.PAYPAL, LocalDateTime.now().minusDays(3).withHour(19).withMinute(15));
            seedSessionPayment(table2, 900000.0, PaymentMethod.QR, LocalDateTime.now().minusDays(3).withHour(20).withMinute(45));

            seedSessionPayment(table4, 8500000.0, PaymentMethod.CASH, LocalDateTime.now().minusDays(2).withHour(12).withMinute(0));
            seedSessionPayment(table5, 4000000.0, PaymentMethod.PAYPAL, LocalDateTime.now().minusDays(2).withHour(18).withMinute(30));
            seedSessionPayment(table1, 800000.0, PaymentMethod.QR, LocalDateTime.now().minusDays(2).withHour(20).withMinute(0));

            seedSessionPayment(table2, 9300000.0, PaymentMethod.CASH, LocalDateTime.now().minusDays(1).withHour(12).withMinute(30));
            seedSessionPayment(table3, 4500000.0, PaymentMethod.PAYPAL, LocalDateTime.now().minusDays(1).withHour(19).withMinute(0));
            seedSessionPayment(table4, 700000.0, PaymentMethod.QR, LocalDateTime.now().minusDays(1).withHour(21).withMinute(15));

            seedSessionPayment(table1, 1500000.0, PaymentMethod.CASH, LocalDateTime.now().withHour(11).withMinute(15));
            seedSessionPayment(table2, 2000000.0, PaymentMethod.CASH, LocalDateTime.now().withHour(12).withMinute(30));
            seedSessionPayment(table3, 3000000.0, PaymentMethod.CASH, LocalDateTime.now().withHour(18).withMinute(0));
            seedSessionPayment(table4, 3000000.0, PaymentMethod.CASH, LocalDateTime.now().withHour(19).withMinute(45));

            seedSessionPayment(table5, 2000000.0, PaymentMethod.PAYPAL, LocalDateTime.now().withHour(12).withMinute(15));
            seedSessionPayment(table1, 3000000.0, PaymentMethod.PAYPAL, LocalDateTime.now().withHour(18).withMinute(45));

            seedSessionPayment(table2, 800000.0, PaymentMethod.QR, LocalDateTime.now().withHour(13).withMinute(0));
        }
    }

    private void seedSessionPayment(RestaurantTable table, Double amount, PaymentMethod method, LocalDateTime time) {
        if (table == null) return;
        TableSession session = TableSession.builder()
                .table(table)
                .status(SessionStatus.CLOSED)
                .openedAt(time.minusHours(2))
                .closedAt(time)
                .customerName("Khách Hàng Thử Nghiệm")
                .customerPhone("0987654321")
                .subtotal(amount)
                .finalAmount(amount)
                .build();
        session = tableSessionRepository.save(session);

        Payment payment = Payment.builder()
                .session(session)
                .amount(amount)
                .paidAt(time)
                .paymentMethod(method)
                .paymentStatus(PaymentStatus.SUCCESS)
                .build();
        paymentRepository.save(payment);
    }

    private void seedUser(String username, Role role) {
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
